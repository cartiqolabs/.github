'use strict';

// Offline: a fake fetch stands in for the Mail API.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const mail = require('..');

const BIN = path.join(__dirname, '..', 'bin', 'cartiqo-mail.js');

/** A fetch that answers from a list, and remembers what it was asked. */
function fakeFetch(answers) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, method: init.method, headers: init.headers, body: init.body ? JSON.parse(init.body) : undefined });
    const a = answers.shift();
    if (a instanceof Error) throw a;
    const headers = new Headers(a.headers || {});
    return new Response(a.body === undefined ? '' : JSON.stringify(a.body), { status: a.status || 200, headers });
  };
  fn.calls = calls;
  return fn;
}
const client = (fetch, opts) => new mail.CartiqoMail('cq_live_test', Object.assign({ fetch, baseUrl: 'https://api.example.test/' }, opts));

test('both entry points have the same API', async () => {
  const esm = await import('../index.mjs');
  for (const k of ['CartiqoMail', 'CartiqoError', 'createClient', 'verifyWebhook', 'signWebhook', 'renderTemplate', 'variablesOf', 'presets', 'presetList', 'presetGroups', 'VERSION']) {
    assert.ok(esm[k] !== undefined, k);
    assert.equal(esm[k], mail[k], k);
  }
  assert.equal(esm.default, mail.CartiqoMail);
  assert.equal(mail.VERSION, require('../package.json').version);
});

test('no key: a clear error', () => {
  const before = process.env.CARTIQO_API_KEY;
  delete process.env.CARTIQO_API_KEY;
  try {
    assert.throws(() => new mail.CartiqoMail(), (e) => e instanceof mail.CartiqoError && e.code === 'missing_api_key');
  } finally {
    if (before !== undefined) process.env.CARTIQO_API_KEY = before;
  }
});

test('send: the key, an Idempotency-Key, camelCase and Dates become the API\'s fields', async () => {
  const fetch = fakeFetch([{ body: { id: 'em_1', status: 'scheduled' }, headers: { 'x-ratelimit-limit': '600', 'x-ratelimit-remaining': '599', 'x-ratelimit-reset': '60' } }]);
  const c = client(fetch);
  const at = new Date('2026-12-01T09:00:00Z');
  const r = await c.emails.send({ from: 'hello@yourshop.dk', to: 'a@example.com', subject: 'Hi', text: 'Hello', scheduledAt: at, replyTo: 'support@yourshop.dk' });
  assert.deepEqual(r, { id: 'em_1', status: 'scheduled' });
  const call = fetch.calls[0];
  assert.equal(call.url, 'https://api.example.test/v1/emails');
  assert.equal(call.method, 'POST');
  assert.equal(call.headers.Authorization, 'Bearer cq_live_test');
  assert.match(call.headers['Idempotency-Key'], /^[0-9a-f-]{36}$/);
  assert.equal(call.body.scheduled_at, '2026-12-01T09:00:00.000Z');
  assert.equal(call.body.reply_to, 'support@yourshop.dk');
  assert.equal(call.body.scheduledAt, undefined);
  assert.deepEqual(c.rateLimit, { limit: 600, remaining: 599, reset: 60 });
});

test('retries: a 503 and a dropped connection are tried again, with the same Idempotency-Key', async () => {
  const fetch = fakeFetch([{ status: 503, body: { error: 'Busy' }, headers: { 'retry-after': '0' } }, new Error('socket hang up'), { body: { id: 'em_2', status: 'queued' } }]);
  const r = await client(fetch, { maxRetries: 2 }).emails.send({ from: 'a@b.dk', to: 'c@d.dk', text: 'x' }, { idempotencyKey: 'order-1042' });
  assert.equal(r.id, 'em_2');
  assert.equal(fetch.calls.length, 3);
  assert.ok(fetch.calls.every((c) => c.headers['Idempotency-Key'] === 'order-1042'));
});

test('errors: 502 is not retried, and the error has status, code and body', async () => {
  const fetch = fakeFetch([{ status: 502, body: { error: 'Sending failed.', code: 'send_failed', id: 'em_3' } }]);
  await assert.rejects(client(fetch).emails.send({ from: 'a@b.dk', to: 'c@d.dk', text: 'x' }), (e) => {
    assert.ok(e instanceof mail.CartiqoError);
    assert.equal(e.status, 502);
    assert.equal(e.code, 'send_failed');
    assert.equal(e.body.id, 'em_3');
    return true;
  });
  assert.equal(fetch.calls.length, 1);
});

test('iterate: follows next_cursor page by page', async () => {
  const fetch = fakeFetch([
    { body: { data: [{ id: 'em_a' }, { id: 'em_b' }], has_more: true, next_cursor: 'em_b' } },
    { body: { data: [{ id: 'em_c' }], has_more: false, next_cursor: null } },
  ]);
  const ids = [];
  for await (const e of client(fetch).emails.iterate({ status: 'bounced', since: new Date('2026-11-01T00:00:00Z') })) ids.push(e.id);
  assert.deepEqual(ids, ['em_a', 'em_b', 'em_c']);
  assert.equal(fetch.calls[0].url, 'https://api.example.test/v1/emails?status=bounced&since=2026-11-01T00%3A00%3A00.000Z');
  assert.match(fetch.calls[1].url, /starting_after=em_b/);
});

test('templates.create takes a preset and sends only what a template is', async () => {
  const fetch = fakeFetch([{ body: { id: 'tpl_1' } }]);
  await client(fetch).templates.create(mail.presets.receipt);
  assert.deepEqual(Object.keys(fetch.calls[0].body).sort(), ['alias', 'html', 'name', 'subject', 'text']);
  assert.equal(fetch.calls[0].body.alias, 'receipt');
});

test('presets: 14, in their groups, by key and camelCase, and each fills in with its sample values', () => {
  assert.equal(mail.presetList.length, 14);
  assert.equal(mail.presets['order-confirmation'], mail.presets.orderConfirmation);
  for (const p of mail.presetList) {
    assert.ok(mail.presetGroups.includes(p.group), p.key);
    const r = mail.renderTemplate(p, p.sample);
    assert.deepEqual(r.missing, [], `${p.key} misses ${r.missing}`);
    assert.ok(r.subject && r.html && r.text, p.key);
    assert.doesNotMatch(r.html + r.text + r.subject, /\{\{/, `${p.key} has a tag left`);
  }
  assert.equal(mail.renderTemplate(mail.presets.orderConfirmation, mail.presets.orderConfirmation.sample).subject, 'Order #1042 is confirmed');
});

test('renderTemplate: escaping, raw, fallbacks, dotted paths and missing names, like the API', () => {
  const t = { subject: 'Hi {{name|there}}\nagain', html: '<p>{{name}} {{{raw}}} {{order.total}} {{gone}}</p>', text: '{{name}}' };
  const r = mail.renderTemplate(t, { name: '<Bo>', raw: '<b>x</b>', order: { total: '9 kr.' } });
  assert.equal(r.subject, 'Hi <Bo> again');
  assert.equal(r.html, '<p>&lt;Bo&gt; <b>x</b> 9 kr. </p>');
  assert.equal(r.text, '<Bo>');
  assert.deepEqual(r.missing, ['gone']);
  assert.equal(mail.renderTemplate(t, {}).subject, 'Hi there again');
  assert.deepEqual(mail.variablesOf(t), ['name', 'raw', 'order.total', 'gone']);
});

test('webhooks: a signed body verifies; a changed body or old timestamp does not', () => {
  const body = JSON.stringify({ id: 'evt_1', type: 'email.delivered', data: { email_id: 'em_1' } });
  const sig = mail.signWebhook(body, 'whsec_test');
  assert.equal(mail.verifyWebhook(body, sig, 'whsec_test').type, 'email.delivered');
  assert.equal(mail.verifyWebhook(Buffer.from(body), sig, 'whsec_test').id, 'evt_1');
  assert.throws(() => mail.verifyWebhook(body.replace('delivered', 'bounced'), sig, 'whsec_test'), (e) => e.code === 'invalid_signature');
  const old = mail.signWebhook(body, 'whsec_test', Math.floor(Date.now() / 1000) - 3600);
  assert.throws(() => mail.verifyWebhook(body, old, 'whsec_test'), /too old/);
  assert.throws(() => mail.verifyWebhook(body, '', 'whsec_test'), /missing or malformed/);
});

test('command line: presets, a preview, and a clear error without a key', () => {
  const run = (...args) => spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8', env: Object.assign({}, process.env, { CARTIQO_API_KEY: '' }) });
  const list = run('presets');
  assert.equal(list.status, 0);
  assert.match(list.stdout, /order-confirmation/);
  const show = run('presets', 'show', 'receipt');
  assert.match(show.stdout, /Subject: Receipt R-2026-0412 from Kolding Tees/);
  const version = run('--version');
  assert.equal(version.stdout.trim(), require('../package.json').version);
  const noKey = run('templates', 'list');
  assert.equal(noKey.status, 1);
  assert.match(noKey.stderr, /CARTIQO_API_KEY/);
  const unknown = run('presets', 'show', 'nope');
  assert.equal(unknown.status, 1);
});
