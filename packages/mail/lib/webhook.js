'use strict';

// Check a webhook's Cartiqo-Signature header (t=<unix seconds>,v1=<hex HMAC-SHA256 of "t.body">).
const { createHmac, timingSafeEqual } = require('node:crypto');
const { CartiqoError } = require('./errors.js');

/**
 * Pass the raw request body (string or Buffer), before JSON.parse. Returns the parsed event, or throws when the
 * signature is wrong or older than `toleranceSec` (default 5 minutes).
 */
function verifyWebhook(rawBody, signatureHeader, secret, toleranceSec) {
  if (toleranceSec === undefined) toleranceSec = 300;
  if (!secret) throw new CartiqoError(0, 'Pass the webhook signing secret (Mail → Settings → Webhooks).', 'invalid_signature');
  const body = typeof rawBody === 'string' ? rawBody : Buffer.from(rawBody).toString('utf8');
  const header = signatureHeader || '';
  const t = (/t=(\d+)/.exec(header) || [])[1];
  const v1 = (/v1=([0-9a-f]+)/.exec(header) || [])[1];
  if (!t || !v1) throw new CartiqoError(400, 'The Cartiqo-Signature header is missing or malformed.', 'invalid_signature');
  if (Math.abs(Date.now() / 1000 - Number(t)) > toleranceSec) throw new CartiqoError(400, 'The webhook timestamp is too old.', 'invalid_signature');
  const expected = createHmac('sha256', secret).update(t + '.' + body).digest('hex');
  if (v1.length !== expected.length || !timingSafeEqual(Buffer.from(v1), Buffer.from(expected))) {
    throw new CartiqoError(400, "The webhook signature doesn't match.", 'invalid_signature');
  }
  return JSON.parse(body);
}

/** The header a webhook would carry for this body: for your own tests. */
function signWebhook(rawBody, secret, timestamp) {
  const t = String(timestamp === undefined ? Math.floor(Date.now() / 1000) : timestamp);
  const body = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
  return 't=' + t + ',v1=' + createHmac('sha256', secret).update(t + '.' + body).digest('hex');
}

module.exports = { verifyWebhook, signWebhook };
