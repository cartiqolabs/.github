#!/usr/bin/env node
'use strict';

// The command line:
//
//   npx @cartiqo/mail send --from "Shop <hello@yourshop.dk>" --to kunde@example.com --subject Hi --text "Hello"
//   npx @cartiqo/mail presets
//   npx @cartiqo/mail templates create --preset receipt
const fs = require('node:fs');
const mail = require('..');
const pkg = require('../package.json');

const HELP = `${pkg.name} ${pkg.version}: send email from your own domain with the CARTIQO Mail API

Send:
  npx @cartiqo/mail send --from <address> --to <address> [--to …] --subject <text>
                         (--text <text> | --html <html> | --html-file <file> | --template <ref> [--var key=value …])
                         [--scheduled-at <ISO time>] [--tag <tag> …] [--reply-to <address>]

Emails (needs a Full access key):
  npx @cartiqo/mail emails list [--status bounced] [--limit 20] [--q text]
  npx @cartiqo/mail emails get <id>
  npx @cartiqo/mail emails cancel <id>

Templates (needs a Full access key):
  npx @cartiqo/mail templates list
  npx @cartiqo/mail templates get <id or alias>
  npx @cartiqo/mail templates create --preset <key> [--name <text>] [--alias <alias>]
  npx @cartiqo/mail templates render <id or alias> [--var key=value …]

Presets (no key needed):
  npx @cartiqo/mail presets                         list the ready-made templates
  npx @cartiqo/mail presets show <key> [-o file]    the preset filled with its sample values (.html or .txt)

Webhooks:
  npx @cartiqo/mail verify-webhook --secret <secret> --signature <Cartiqo-Signature> --body-file <file>

Other:
  npx @cartiqo/mail --help | --version

The key comes from --key or the CARTIQO_API_KEY environment variable (create one in Mail → Settings → API keys).
--base-url (or CARTIQO_API_URL) points at another API, e.g. http://localhost:4000. Answers print as JSON.

Examples:
  npx @cartiqo/mail send --from "Kolding Tees <hello@koldingtees.dk>" --to sofie@example.com \\
                         --template order-confirmation --var name=Sofie --var order.number=#1042 --var order.total="637 kr."
  npx @cartiqo/mail presets show receipt -o receipt.html
`;

function parse(argv) {
  const out = { _: [], vars: {}, to: [], tag: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-o') { out.output = argv[++i]; continue; }
    if (!a.startsWith('--')) { out._.push(a); continue; }
    let key = a.slice(2);
    let value;
    const eq = key.indexOf('=');
    if (eq > -1) { value = key.slice(eq + 1); key = key.slice(0, eq); }
    else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) value = argv[++i];
    else value = true;
    if (key === 'var') {
      const [k, ...rest] = String(value).split('=');
      setPath(out.vars, k, rest.join('='));
    } else if (key === 'to' || key === 'tag') out[key].push(String(value));
    else out[key.replace(/-([a-z])/g, (_m, c) => c.toUpperCase())] = value;
  }
  return out;
}

function setPath(obj, path, value) {
  const parts = path.split('.');
  let o = obj;
  for (const p of parts.slice(0, -1)) o = o[p] = o[p] && typeof o[p] === 'object' ? o[p] : {};
  o[parts[parts.length - 1]] = value;
}

const print = (v) => process.stdout.write(JSON.stringify(v, null, 2) + '\n');
const fail = (msg) => {
  process.stderr.write(msg + '\n');
  process.exit(1);
};

function client(args) {
  return new mail.CartiqoMail(args.key, { baseUrl: args.baseUrl });
}

function preset(key) {
  const p = mail.presets[key];
  if (!p) fail(`No preset called "${key}". See npx @cartiqo/mail presets.`);
  return p;
}

async function main() {
  const args = parse(process.argv.slice(2));
  const [cmd, sub, ref] = args._;
  if (args.version) return process.stdout.write(pkg.version + '\n');
  if (!cmd || args.help || cmd === 'help') return process.stdout.write(HELP);

  if (cmd === 'presets') {
    if (!sub || sub === 'list') {
      for (const g of mail.presetGroups) {
        process.stdout.write(`\n${g}\n`);
        for (const p of mail.presetList.filter((x) => x.group === g)) process.stdout.write(`  ${p.key.padEnd(22)} ${p.about}\n`);
      }
      return process.stdout.write('\nnpx @cartiqo/mail presets show <key>    see one filled in\n');
    }
    if (sub === 'show') {
      const p = preset(ref);
      const r = mail.renderTemplate(p, p.sample);
      if (args.output) {
        fs.writeFileSync(args.output, /\.txt$/i.test(args.output) ? r.text : r.html);
        return process.stdout.write(`Wrote ${args.output}\n`);
      }
      return process.stdout.write(`Subject: ${r.subject}\nVariables: ${mail.variablesOf(p).join(', ')}\n\n${r.text}\n`);
    }
    fail(`Unknown: presets ${sub}. Try npx @cartiqo/mail --help.`);
  }

  if (cmd === 'verify-webhook') {
    if (!args.secret || !args.signature || !args.bodyFile) fail('Pass --secret, --signature and --body-file.');
    return print(mail.verifyWebhook(fs.readFileSync(args.bodyFile), args.signature, args.secret, args.tolerance ? Number(args.tolerance) : undefined));
  }

  if (cmd === 'send') {
    if (!args.from || !args.to.length) fail('Pass --from and at least one --to.');
    const email = { from: args.from, to: args.to.length === 1 ? args.to[0] : args.to };
    if (args.subject) email.subject = args.subject;
    if (args.text) email.text = args.text;
    if (args.html) email.html = args.html;
    if (args.htmlFile) email.html = fs.readFileSync(args.htmlFile, 'utf8');
    if (args.template) (email.template = args.template), (email.variables = args.vars);
    if (args.scheduledAt) email.scheduled_at = args.scheduledAt;
    if (args.replyTo) email.reply_to = args.replyTo;
    if (args.tag.length) email.tags = args.tag;
    return print(await client(args).emails.send(email));
  }

  if (cmd === 'emails') {
    const c = client(args);
    if (sub === 'list') return print(await c.emails.list({ status: args.status, limit: args.limit, q: args.q, tag: args.tag[0] }));
    if (sub === 'get' && ref) return print(await c.emails.get(ref));
    if (sub === 'cancel' && ref) return print(await c.emails.cancel(ref));
    fail('Try: emails list | emails get <id> | emails cancel <id>');
  }

  if (cmd === 'templates') {
    const c = client(args);
    if (sub === 'list') return print(await c.templates.list());
    if (sub === 'get' && ref) return print(await c.templates.get(ref));
    if (sub === 'render' && ref) return print(await c.templates.render(ref, args.vars));
    if (sub === 'create') {
      if (!args.preset) fail('Pass --preset <key>, e.g. --preset receipt. See npx @cartiqo/mail presets.');
      const p = Object.assign({}, preset(args.preset));
      if (typeof args.name === 'string') p.name = args.name;
      if (typeof args.alias === 'string') p.alias = args.alias;
      return print(await c.templates.create(p));
    }
    fail('Try: templates list | templates get <ref> | templates create --preset <key> | templates render <ref>');
  }

  fail(`Unknown command: ${cmd}. Try npx @cartiqo/mail --help.`);
}

main().catch((e) => {
  if (e instanceof mail.CartiqoError) fail(`${e.message}${e.code ? ` (${e.code}${e.status ? `, ${e.status}` : ''})` : ''}`);
  fail(e && e.stack ? e.stack : String(e));
});
