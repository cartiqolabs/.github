# @cartiqo/mail

Send email from your own domain with the [CARTIQO Mail API](https://cartiqo.email/mail/docs): single emails, batches, scheduled sends, templates, and signed webhooks for deliveries and bounces. It comes with 14 ready-made templates, from sign-up codes to receipts, and a command line. No dependencies.

```js
import { CartiqoMail } from '@cartiqo/mail';

const mail = new CartiqoMail(process.env.CARTIQO_API_KEY);
await mail.emails.send({ from: 'Shop <hello@yourshop.dk>', to: 'sofie@example.com', subject: 'Hi', text: 'Thanks for your order.' });
```

> CARTIQO Mail is in a private, invite-only early access. Ask for access on [cartiqo.email](https://cartiqo.email).

**Contents**

1. [Install](#install)
2. [Before you send](#1-before-you-send)
3. [Your first email](#2-your-first-email)
4. [Templates and the 14 presets](#3-templates-and-the-14-presets)
5. [Batches, scheduling and retries](#4-batches-scheduling-and-retries)
6. [Reading your logs](#5-reading-your-logs)
7. [Webhooks](#6-webhooks)
8. [The command line](#7-the-command-line)
9. [Errors](#8-errors)
10. [All the options](#9-all-the-options)

## Install

```bash
npm install @cartiqo/mail
```

You need Node 18 or newer, or Deno, Bun or any runtime with `fetch`. Types are included. Using CommonJS? `const { CartiqoMail } = require('@cartiqo/mail')` works too.

## 1. Before you send

1. On [cartiqo.email](https://cartiqo.email), open **Settings → Domains** and add your domain, like `yourshop.dk`. Add the DNS records it shows you, then press **Check DNS** until it says the domain can send.
2. Open **Settings → API keys** and create a key. **Send only** keys can send, schedule and cancel. Reading logs and managing templates needs **Full access**.
3. Put the key in the `CARTIQO_API_KEY` environment variable. `new CartiqoMail()` reads it from there.

Keep keys on your server; never put them in a web page or an app.

## 2. Your first email

```js
import { CartiqoMail } from '@cartiqo/mail';

const mail = new CartiqoMail();

const { id, status } = await mail.emails.send({
  from: 'Kolding Tees <hello@koldingtees.dk>',
  to: 'sofie@example.com',
  subject: 'Your order #1042',
  html: '<p>Thanks for your order. It ships tomorrow.</p>',
  text: 'Thanks for your order. It ships tomorrow.',
});
// id: "em_7Hq2…", status: "sent"
```

The `from` address must be on a domain you verified. `to` takes one address or up to 50. Add `tags: ['receipt']` to find emails later, and `replyTo` for where answers go.

## 3. Templates and the 14 presets

A template is a saved subject, html and text with `{{variables}}`. You make it once and send it with new values each time:

```js
await mail.emails.send({
  from: 'hello@koldingtees.dk',
  to: 'sofie@example.com',
  template: 'signup-code',
  variables: { name: 'Sofie', code: '482 913' },
});
```

The template language is small:

| Write | You get |
| --- | --- |
| `{{name}}` | the value, made safe for HTML in the html part |
| `{{{body_html}}}` | the value as it is, for HTML you build yourself |
| `{{name\|there}}` | the value, or `there` when it's missing |
| `{{order.total}}` | a value inside an object: `variables: { order: { total: '637 kr.' } }` |

Sending without a variable that has no fallback fails with `missing_variables`, so nobody gets "Hi ,".

### The presets

This package carries the same ready-made templates Mail offers under **Settings → Templates → New template**. Each one is email-client-safe HTML with a text version. Create one as it is, or change anything first:

```js
import { CartiqoMail, presets } from '@cartiqo/mail';

const mail = new CartiqoMail();
await mail.templates.create(presets.receipt);                                  // alias "receipt"
await mail.templates.create({ ...presets.welcome, alias: 'hello', subject: 'Hej {{name}}' });
```

| Group | Presets |
| --- | --- |
| Account | `signup-code`, `welcome`, `password-reset`, `magic-link`, `team-invite` |
| Shop | `order-confirmation`, `shipped`, `abandoned-cart` |
| Bookings | `booking-confirmation`, `booking-reminder` |
| Billing | `receipt`, `invoice-due` |
| Other | `newsletter`, `contact-received` |

Use them by key, `presets['order-confirmation']`, or camelCased, `presets.orderConfirmation`. Each has `name`, `about`, `group`, `alias`, `subject`, `html`, `text` and `sample`: values that make it read like a real email.

There are no loops in templates, so a list (like the items in an order) goes in as one value you build: `order.items_html` and `order.items_text` in the order confirmation.

### See a template without sending it

`renderTemplate` fills a template exactly the way the API does, with no request. It's useful for tests and previews:

```js
import { presets, renderTemplate, variablesOf } from '@cartiqo/mail';

const { subject, html, text, missing } = renderTemplate(presets.receipt, presets.receipt.sample);
// subject: "Receipt R-2026-0412 from Kolding Tees", missing: []
variablesOf(presets.receipt); // ['receipt.number', 'brand', 'name', …]
```

`examples/presets.mjs` writes every preset to an HTML file, so you can open them in a browser.

### Managing templates (Full access key)

```js
const { data } = await mail.templates.list();
const t = await mail.templates.get('receipt');                  // by id (tpl_…) or alias
await mail.templates.update('receipt', { subject: 'Kvittering {{receipt.number}}' });
const preview = await mail.templates.render('receipt', { name: 'Bo' }); // preview.missing_variables
await mail.templates.delete('receipt');
```

## 4. Batches, scheduling and retries

```js
// Up to 100 at once. If one is wrong, none are sent.
await mail.emails.batch([
  { from, to: 'a@example.com', template: 'shipped', variables: { order: { number: '#1042' } } },
  { from, to: 'b@example.com', template: 'shipped', variables: { order: { number: '#1043' } } },
]);

// Later: a Date or an ISO time, up to 30 days ahead. Then change your mind.
const s = await mail.emails.send({ from, to, template: 'booking-reminder', variables, scheduledAt: new Date('2026-12-01T07:00:00Z') });
await mail.emails.reschedule(s.id, '2026-12-01T08:00:00Z');
await mail.emails.cancel(s.id);
```

Every `send` and `batch` carries an `Idempotency-Key`, a fresh UUID unless you pass one. The client retries dropped connections, 429 and 5xx answers up to `maxRetries` times (default 2), and waits for `Retry-After` when the API sends it. A retry gets the first answer back, so nobody gets the email twice.

Pass your own key to keep retries safe across restarts too. Your order id works well:

```js
await mail.emails.send(email, { idempotencyKey: `receipt-${order.id}` });
```

A `502 send_failed` is not retried. The email is saved as failed and is in your logs, and `error.body.id` has its id.

## 5. Reading your logs

These need a Full access key.

```js
const email = await mail.emails.get('em_7Hq2aB9xYz1cD4eF');     // with its events: sent, delivered, bounced…

// A page, newest first. Filter by status, tag, to, q (recipient, subject or id), since and until.
const page = await mail.emails.list({ status: 'bounced', since: new Date('2026-11-01'), limit: 50 });

// Or every match, page by page
for await (const e of mail.emails.iterate({ tag: 'receipt' })) console.log(e.id, e.status);
```

`mail.rateLimit` holds the limits from the last answer: `{ limit, remaining, reset }`.

## 6. Webhooks

Add an https address in **Settings → Webhooks**, and Mail sends a signed POST for every event on your emails: `email.sent`, `email.delivered`, `email.bounced`, `email.complained` and more. With Express:

```js
import express from 'express';
import { verifyWebhook } from '@cartiqo/mail';

app.post('/webhooks/cartiqo', express.raw({ type: 'application/json' }), (req, res) => {
  const event = verifyWebhook(req.body, req.headers['cartiqo-signature'], process.env.CARTIQO_WEBHOOK_SECRET);
  if (event.type === 'email.bounced') { /* stop emailing event.data.to */ }
  res.sendStatus(200);
});
```

Pass the raw body, before it's parsed as JSON. `verifyWebhook` throws when the signature is wrong or more than 5 minutes old. For your own tests, `signWebhook(body, secret)` makes a valid header.

## 7. The command line

```bash
npx @cartiqo/mail presets                                    # the 14 presets
npx @cartiqo/mail presets show receipt -o receipt.html       # one, filled with sample values

npx @cartiqo/mail send --from "Kolding Tees <hello@koldingtees.dk>" --to sofie@example.com \
  --subject "Hi" --text "Thanks for your order."

npx @cartiqo/mail templates create --preset order-confirmation
npx @cartiqo/mail send --from hello@koldingtees.dk --to sofie@example.com \
  --template order-confirmation --var name=Sofie --var order.number=#1042 --var "order.total=637 kr."

npx @cartiqo/mail emails list --status bounced
npx @cartiqo/mail verify-webhook --secret whsec_… --signature "t=…,v1=…" --body-file event.json
```

The key comes from `--key` or `CARTIQO_API_KEY`. Answers print as JSON. `npx @cartiqo/mail --help` lists everything.

## 8. Errors

A failed call throws a `CartiqoError` with these fields:
- `status`: the HTTP status, or 0 when the API couldn't be reached;
- `message`: what went wrong and how to fix it;
- `code`: stable, to branch on;
- `body` and `retryAfter`.

```js
import { CartiqoError } from '@cartiqo/mail';

try {
  await mail.emails.send(email);
} catch (e) {
  if (e instanceof CartiqoError && e.code === 'domain_not_verified') { /* … */ }
  else throw e;
}
```

The common codes:
- keys: `missing_api_key`, `invalid_api_key`, `insufficient_permission`;
- input: `invalid_input`, `invalid_from`, `invalid_recipient`;
- sending: `domain_not_verified`, `recipient_suppressed`, `send_failed`;
- templates: `template_not_found`, `missing_variables`;
- limits: `monthly_quota`, `daily_quota`, `rate_limited`;
- webhooks: `invalid_signature`.

The full list is in the [docs](https://cartiqo.email/mail/docs#errors).

## 9. All the options

```js
new CartiqoMail(apiKey, {
  baseUrl: 'https://api.cartiqo.app', // or CARTIQO_API_URL, e.g. http://localhost:4000 in development
  maxRetries: 2,                      // for dropped connections, 429 and 5xx (not 502)
  timeout: 30000,                     // milliseconds per attempt
  fetch,                              // your own fetch
});
```

| Export | What |
| --- | --- |
| `CartiqoMail`, `createClient(key, options)` | the client |
| `CartiqoError` | what failed calls throw |
| `presets`, `presetList`, `presetGroups` | the 14 ready-made templates |
| `renderTemplate(template, variables)`, `variablesOf(template)` | fill or inspect a template locally |
| `verifyWebhook(body, signature, secret)`, `signWebhook(body, secret)` | webhook signatures |
| `VERSION`, `DEFAULT_BASE_URL` | |

## Development

```bash
cd packages/mail && npm test
```

The tests run offline: a fake `fetch` stands in for the API.

MIT licensed. Made by [CARTIQO Labs](https://cartiqolabs.com).
