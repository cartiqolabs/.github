'use strict';

// The client for the CARTIQO Mail API (https://cartiqo.email/mail/docs). Node 18+, Deno, Bun or any runtime with
// fetch. No dependencies.
const { randomUUID } = require('node:crypto');
const { CartiqoError } = require('./errors.js');

const VERSION = require('../package.json').version;
const DEFAULT_BASE_URL = 'https://api.cartiqo.app';
// Answers worth trying again. 502 isn't one: it means the email was saved as failed and is in your logs.
const RETRY_STATUS = new Set([408, 409, 429, 500, 503, 504]);

class CartiqoMail {
  /**
   * @param {string} [apiKey] a cq_live_… key; defaults to the CARTIQO_API_KEY environment variable
   * @param {{ baseUrl?: string, fetch?: typeof fetch, maxRetries?: number, timeout?: number }} [options]
   */
  constructor(apiKey, options) {
    const env = (globalThis.process && globalThis.process.env) || {};
    apiKey = apiKey || env.CARTIQO_API_KEY;
    options = options || {};
    if (!apiKey) throw new CartiqoError(0, 'Pass your API key (cq_live_…) or set CARTIQO_API_KEY. Create one in Mail → Settings → API keys.', 'missing_api_key');
    this.apiKey = apiKey;
    this.baseUrl = String(options.baseUrl || env.CARTIQO_API_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.fetch = options.fetch || globalThis.fetch;
    this.maxRetries = options.maxRetries === undefined ? 2 : options.maxRetries;
    this.timeout = options.timeout === undefined ? 30000 : options.timeout;
    /** The x-ratelimit-* headers of the last answer: { limit, remaining, reset }, in requests and seconds. */
    this.rateLimit = null;
    const id = encodeURIComponent;
    const self = this;

    this.emails = {
      // Sends carry an Idempotency-Key, so a retry after a dropped connection never sends twice.
      send: (email, opts) => self.request('POST', '/v1/emails', email, { idempotencyKey: (opts && opts.idempotencyKey) || randomUUID() }),
      batch: (emails, opts) => self.request('POST', '/v1/emails/batch', emails, { idempotencyKey: (opts && opts.idempotencyKey) || randomUUID() }),
      get: (emailId) => self.request('GET', '/v1/emails/' + id(emailId)),
      list: (params) => self.request('GET', '/v1/emails' + query(params || {})),
      /** Every email that matches, page by page: for await (const e of mail.emails.iterate({ status: 'bounced' })). */
      iterate: (params) => iterate(self, params || {}),
      cancel: (emailId) => self.request('POST', '/v1/emails/' + id(emailId) + '/cancel'),
      reschedule: (emailId, scheduledAt) => self.request('PATCH', '/v1/emails/' + id(emailId), { scheduled_at: toIso(scheduledAt) }),
    };

    this.templates = {
      list: () => self.request('GET', '/v1/templates'),
      get: (ref) => self.request('GET', '/v1/templates/' + id(ref)),
      /** A template, or a preset from this package: mail.templates.create(presets.receipt). */
      create: (template) => self.request('POST', '/v1/templates', toTemplate(template)),
      update: (ref, changes) => self.request('PATCH', '/v1/templates/' + id(ref), toTemplate(changes)),
      delete: (ref) => self.request('DELETE', '/v1/templates/' + id(ref)),
      render: (ref, variables) => self.request('POST', '/v1/templates/' + id(ref) + '/render', { variables: variables || {} }),
    };
  }

  async request(method, path, body, opts) {
    const idempotencyKey = opts && opts.idempotencyKey;
    const headers = { Authorization: 'Bearer ' + this.apiKey, 'User-Agent': '@cartiqo/mail/' + VERSION };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    const payload = body !== undefined ? JSON.stringify(normalize(body)) : undefined;

    for (let attempt = 0; ; attempt++) {
      let res;
      try {
        res = await this.fetch(this.baseUrl + path, { method, headers, body: payload, signal: AbortSignal.timeout(this.timeout) });
      } catch (err) {
        // No answer at all: safe to retry reads, and writes that carry an Idempotency-Key.
        if (attempt < this.maxRetries && (method === 'GET' || idempotencyKey)) {
          await sleep(backoff(attempt));
          continue;
        }
        throw new CartiqoError(0, "Couldn't reach the Mail API: " + ((err && err.message) || err), 'network_error', null);
      }
      this.rateLimit = readRateLimit(res.headers);
      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (_) {
        data = { error: text };
      }
      if (res.ok) return data;
      const retryAfter = Number(res.headers.get('retry-after')) || null;
      // 409 only while another try of this same request is still running.
      const retryable = RETRY_STATUS.has(res.status) && (res.status !== 409 || data.code === 'idempotency_in_progress');
      if (retryable && attempt < this.maxRetries && (method !== 'POST' || idempotencyKey || res.status === 429)) {
        await sleep(retryAfter ? Math.min(retryAfter, 60) * 1000 : backoff(attempt));
        continue;
      }
      // A suppressed (422) or failed (502) send still has an id: it's in your logs, and in error.body.
      throw new CartiqoError(res.status, data.error || 'Request failed (' + res.status + ').', data.code, data, retryAfter);
    }
  }
}

async function* iterate(client, params) {
  let cursor = params.startingAfter || params.starting_after;
  for (;;) {
    const page = await client.emails.list(Object.assign({}, params, { startingAfter: cursor, starting_after: undefined }));
    yield* page.data;
    if (!page.has_more) return;
    cursor = page.next_cursor;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const backoff = (attempt) => Math.min(8000, 500 * 2 ** attempt) * (0.75 + Math.random() / 2);
const toIso = (d) => (d instanceof Date ? d.toISOString() : d);

function readRateLimit(h) {
  const limit = h.get('x-ratelimit-limit');
  if (limit === null) return null;
  return { limit: Number(limit), remaining: Number(h.get('x-ratelimit-remaining')), reset: Number(h.get('x-ratelimit-reset')) };
}

// List filters: camelCase or snake_case, Dates for since and until.
function query(params) {
  const p = Object.assign({}, params);
  if (p.startingAfter !== undefined) (p.starting_after = p.startingAfter), delete p.startingAfter;
  const qs = new URLSearchParams();
  for (const k of Object.keys(p)) {
    const v = p[k];
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(toIso(v)));
  }
  const s = qs.toString();
  return s ? '?' + s : '';
}

// scheduledAt / replyTo and Dates as well as the API's snake_case strings.
function normalize(body) {
  if (Array.isArray(body)) return body.map(normalize);
  if (!body || typeof body !== 'object') return body;
  const out = Object.assign({}, body);
  if (out.scheduledAt !== undefined) (out.scheduled_at = out.scheduledAt), delete out.scheduledAt;
  if (out.replyTo !== undefined) (out.reply_to = out.replyTo), delete out.replyTo;
  if (out.scheduled_at !== undefined) out.scheduled_at = toIso(out.scheduled_at);
  return out;
}

// A preset carries extras (key, about, sample, …) the API doesn't take: keep only what a template is.
function toTemplate(t) {
  if (!t || typeof t !== 'object') return t;
  const out = {};
  for (const k of ['name', 'alias', 'subject', 'html', 'text']) if (t[k] !== undefined) out[k] = t[k];
  return out;
}

module.exports = { CartiqoMail, VERSION, DEFAULT_BASE_URL };
