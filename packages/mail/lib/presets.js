'use strict';

// Ready-made Mail API templates, the same ones Mail offers under Settings → Templates → New template. Each is a plain
// template once you create it: mail.templates.create(presets.receipt). They only use what the template language knows
// ({{name}}, {{name|fallback}}, {{order.total}}, {{{raw_html}}}), no loops, so lists come in as one pre-built value.
// `sample` holds values that make the preview read like a real email: renderTemplate(preset, preset.sample).

/** Simple, email-client-safe HTML around a preset's body: a centred 560px card, the sender's name on top. */
function layout(body, footer = "You get this email because you have an account with {{brand|us}}.") {
  return `<div style="background:#f4f4f5;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px">
    <tr><td style="padding:28px 32px 0;font-size:15px;font-weight:700">{{brand|Your company}}</td></tr>
    <tr><td style="padding:20px 32px 28px;font-size:15px;line-height:1.6">
${body}
    </td></tr>
  </table>
  <p style="max-width:560px;margin:16px auto 0;font-size:12px;line-height:1.5;color:#71717a;text-align:center">${footer}</p>
</div>`;
}
const button = (href, label) =>
  `      <p style="margin:24px 0"><a href="${href}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600">${label}</a></p>`;
const rows = (pairs) =>
  `      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-top:1px solid #e4e4e7">
${pairs.map(([k, v]) => `        <tr><td style="padding:10px 0;border-bottom:1px solid #e4e4e7;color:#71717a">${k}</td><td style="padding:10px 0;border-bottom:1px solid #e4e4e7;text-align:right">${v}</td></tr>`).join("\n")}
      </table>`;

const BRAND = { brand: "Kolding Tees" };

const LIST = [
  {
    key: "signup-code",
    name: "Sign-up code",
    about: "A one-time code to confirm a new account.",
    icon: "key",
    group: "Account",
    alias: "signup-code",
    subject: "Your code for {{brand|our site}}: {{code}}",
    html: layout(`      <p style="margin:0 0 12px">Hi {{name|there}},</p>
      <p style="margin:0 0 12px">Use this code to finish signing up. It works for {{minutes|10}} minutes.</p>
      <p style="margin:20px 0;font-size:28px;font-weight:700;letter-spacing:6px">{{code}}</p>
      <p style="margin:0;color:#71717a">Didn't sign up? Then you can ignore this email.</p>`),
    text: "Hi {{name|there}},\n\nYour code: {{code}}\nIt works for {{minutes|10}} minutes.\n\nDidn't sign up? Then you can ignore this email.\n\n— {{brand|Your company}}",
    sample: { ...BRAND, name: "Sofie", code: "482 913", minutes: "10" },
  },
  {
    key: "welcome",
    name: "Welcome",
    about: "Says hello after sign-up, with one next step.",
    icon: "smile",
    group: "Account",
    alias: "welcome",
    subject: "Welcome to {{brand|our site}}, {{name|there}}",
    html: layout(`      <p style="margin:0 0 12px">Hi {{name|there}},</p>
      <p style="margin:0 0 12px">Thanks for joining {{brand|us}}. Your account is ready.</p>
${button("{{url}}", "{{cta|Get started}}")}
      <p style="margin:0;color:#71717a">Questions? Just reply to this email.</p>`),
    text: "Hi {{name|there}},\n\nThanks for joining {{brand|us}}. Your account is ready.\n\n{{cta|Get started}}: {{url}}\n\nQuestions? Just reply to this email.\n\n— {{brand|Your company}}",
    sample: { ...BRAND, name: "Sofie", url: "https://koldingtees.dk/account", cta: "Open your account" },
  },
  {
    key: "password-reset",
    name: "Password reset",
    about: "A link to choose a new password.",
    icon: "lock",
    group: "Account",
    alias: "password-reset",
    subject: "Reset your password",
    html: layout(`      <p style="margin:0 0 12px">Hi {{name|there}},</p>
      <p style="margin:0 0 12px">Someone asked to reset the password for your account. If it was you, choose a new one here. The link works for {{minutes|30}} minutes.</p>
${button("{{url}}", "Choose a new password")}
      <p style="margin:0;color:#71717a">If it wasn't you, ignore this email. Your password stays the same.</p>`),
    text: "Hi {{name|there}},\n\nChoose a new password here (the link works for {{minutes|30}} minutes):\n{{url}}\n\nIf it wasn't you, ignore this email. Your password stays the same.\n\n— {{brand|Your company}}",
    sample: { ...BRAND, name: "Sofie", url: "https://koldingtees.dk/reset#token=…", minutes: "30" },
  },
  {
    key: "magic-link",
    name: "Log-in link",
    about: "Log in with one click, no password.",
    icon: "send",
    group: "Account",
    alias: "login-link",
    subject: "Your log-in link for {{brand|our site}}",
    html: layout(`      <p style="margin:0 0 12px">Hi {{name|there}},</p>
      <p style="margin:0 0 12px">Click below to log in. The link works once, for {{minutes|15}} minutes.</p>
${button("{{url}}", "Log in")}
      <p style="margin:0;color:#71717a">Didn't ask for this? Then you can ignore it.</p>`),
    text: "Hi {{name|there}},\n\nLog in here (works once, for {{minutes|15}} minutes):\n{{url}}\n\nDidn't ask for this? Then you can ignore it.\n\n— {{brand|Your company}}",
    sample: { ...BRAND, name: "Sofie", url: "https://koldingtees.dk/login#t=…", minutes: "15" },
  },
  {
    key: "team-invite",
    name: "Invitation",
    about: "Invite someone to join a team or workspace.",
    icon: "users",
    group: "Account",
    alias: "invite",
    subject: "{{inviter}} invited you to {{team}}",
    html: layout(`      <p style="margin:0 0 12px">Hi,</p>
      <p style="margin:0 0 12px"><b>{{inviter}}</b> invited you to join <b>{{team}}</b> on {{brand|our site}}.</p>
${button("{{url}}", "Accept the invitation")}
      <p style="margin:0;color:#71717a">The invitation works for {{days|7}} days.</p>`, "You get this email because someone invited you."),
    text: "Hi,\n\n{{inviter}} invited you to join {{team}} on {{brand|our site}}.\n\nAccept here: {{url}}\nThe invitation works for {{days|7}} days.\n\n— {{brand|Your company}}",
    sample: { ...BRAND, inviter: "Micas", team: "Kolding Tees support", url: "https://koldingtees.dk/invite/…", days: "7" },
  },
  {
    key: "order-confirmation",
    name: "Order confirmation",
    about: "Thanks for the order, with what was bought and the total.",
    icon: "bag",
    group: "Shop",
    alias: "order-confirmation",
    subject: "Order {{order.number}} is confirmed",
    html: layout(`      <p style="margin:0 0 12px">Hi {{name|there}},</p>
      <p style="margin:0 0 12px">Thanks for your order. We'll email you again when it ships.</p>
      {{{order.items_html}}}
${rows([["Order", "{{order.number}}"], ["Shipping", "{{order.shipping|Free}}"], ["<b>Total</b>", "<b>{{order.total}}</b>"]])}
${button("{{order.url}}", "See your order")}`, "You get this email because you ordered from {{brand|us}}."),
    text: "Hi {{name|there}},\n\nThanks for your order {{order.number}}.\n\n{{order.items_text}}\nShipping: {{order.shipping|Free}}\nTotal: {{order.total}}\n\nSee your order: {{order.url}}\n\n— {{brand|Your company}}",
    sample: {
      ...BRAND,
      name: "Sofie",
      "order.number": "#1042",
      "order.items_html": '<p style="margin:0">Bone tee, L × 1 — 299 kr.<br>Black tee, M × 1 — 299 kr.</p>',
      "order.items_text": "Bone tee, L × 1 — 299 kr.\nBlack tee, M × 1 — 299 kr.",
      "order.shipping": "39 kr.",
      "order.total": "637 kr.",
      "order.url": "https://koldingtees.dk/orders/1042",
    },
  },
  {
    key: "shipped",
    name: "Shipped",
    about: "The order is on its way, with tracking.",
    icon: "truck",
    group: "Shop",
    alias: "order-shipped",
    subject: "Order {{order.number}} is on its way",
    html: layout(`      <p style="margin:0 0 12px">Hi {{name|there}},</p>
      <p style="margin:0 0 12px">Your order {{order.number}} has left us with {{carrier|the carrier}}. Expect it {{eta|in 1–3 working days}}.</p>
${button("{{tracking_url}}", "Track the parcel")}`, "You get this email because you ordered from {{brand|us}}."),
    text: "Hi {{name|there}},\n\nYour order {{order.number}} has left us with {{carrier|the carrier}}. Expect it {{eta|in 1–3 working days}}.\n\nTrack it: {{tracking_url}}\n\n— {{brand|Your company}}",
    sample: { ...BRAND, name: "Sofie", "order.number": "#1042", carrier: "GLS", eta: "on Thursday", tracking_url: "https://gls-group.eu/track/…" },
  },
  {
    key: "abandoned-cart",
    name: "Left in the cart",
    about: "A gentle reminder about items left in the cart.",
    icon: "bag",
    group: "Shop",
    alias: "cart-reminder",
    subject: "You left something in your cart",
    html: layout(`      <p style="margin:0 0 12px">Hi {{name|there}},</p>
      <p style="margin:0 0 12px">Your cart is saved: {{items|your items}}. Pick up where you left off whenever you like.</p>
${button("{{url}}", "Back to your cart")}`, "You get this email because you started an order with {{brand|us}}. <a href=\"{{unsubscribe_url}}\" style=\"color:#71717a\">Don't send these</a>."),
    text: "Hi {{name|there}},\n\nYour cart is saved: {{items|your items}}.\nBack to your cart: {{url}}\n\nDon't want these emails? {{unsubscribe_url}}\n\n— {{brand|Your company}}",
    sample: { ...BRAND, name: "Sofie", items: "Bone tee, L", url: "https://koldingtees.dk/cart", unsubscribe_url: "https://koldingtees.dk/unsubscribe/…" },
  },
  {
    key: "booking-confirmation",
    name: "Booking confirmed",
    about: "Date, time and place of a booking.",
    icon: "clock",
    group: "Bookings",
    alias: "booking-confirmed",
    subject: "Booked: {{service}} on {{date}}",
    html: layout(`      <p style="margin:0 0 12px">Hi {{name|there}},</p>
      <p style="margin:0 0 12px">You're booked in. See you then.</p>
${rows([["What", "{{service}}"], ["When", "{{date}}, {{time}}"], ["Where", "{{place}}"]])}
${button("{{manage_url}}", "Move or cancel")}`, "You get this email because you made a booking with {{brand|us}}."),
    text: "Hi {{name|there}},\n\nYou're booked in.\n\nWhat: {{service}}\nWhen: {{date}}, {{time}}\nWhere: {{place}}\n\nMove or cancel: {{manage_url}}\n\n— {{brand|Your company}}",
    sample: { brand: "Kolding Autoservice", name: "Mette", service: "Service check", date: "Tuesday 18 November", time: "09:30", place: "Vejlevej 12, Kolding", manage_url: "https://koldingauto.dk/b/…" },
  },
  {
    key: "booking-reminder",
    name: "Booking reminder",
    about: "The day before: a reminder so nobody forgets.",
    icon: "bell",
    group: "Bookings",
    alias: "booking-reminder",
    subject: "Reminder: {{service}} {{when|tomorrow}} at {{time}}",
    html: layout(`      <p style="margin:0 0 12px">Hi {{name|there}},</p>
      <p style="margin:0 0 12px">A reminder of your {{service}} {{when|tomorrow}} at <b>{{time}}</b>, at {{place}}.</p>
      <p style="margin:0 0 12px">Can't make it? Let us know, so someone else can have the time.</p>
${button("{{manage_url}}", "Move or cancel")}`, "You get this email because you made a booking with {{brand|us}}."),
    text: "Hi {{name|there}},\n\nA reminder of your {{service}} {{when|tomorrow}} at {{time}}, at {{place}}.\n\nCan't make it? Move or cancel: {{manage_url}}\n\n— {{brand|Your company}}",
    sample: { brand: "Kolding Autoservice", name: "Mette", service: "service check", when: "tomorrow", time: "09:30", place: "Vejlevej 12, Kolding", manage_url: "https://koldingauto.dk/b/…" },
  },
  {
    key: "receipt",
    name: "Receipt",
    about: "Payment received, with amount and method.",
    icon: "wallet",
    group: "Billing",
    alias: "receipt",
    subject: "Receipt {{receipt.number}} from {{brand|us}}",
    html: layout(`      <p style="margin:0 0 12px">Hi {{name|there}},</p>
      <p style="margin:0 0 12px">Thanks, we've received your payment.</p>
${rows([["Receipt", "{{receipt.number}}"], ["Date", "{{receipt.date}}"], ["Paid with", "{{receipt.method}}"], ["<b>Amount</b>", "<b>{{receipt.amount}}</b>"]])}
${button("{{receipt.url}}", "Download the PDF")}`),
    text: "Hi {{name|there}},\n\nThanks, we've received your payment.\n\nReceipt: {{receipt.number}}\nDate: {{receipt.date}}\nPaid with: {{receipt.method}}\nAmount: {{receipt.amount}}\n\nPDF: {{receipt.url}}\n\n— {{brand|Your company}}",
    sample: { ...BRAND, name: "Sofie", "receipt.number": "R-2026-0412", "receipt.date": "17 November 2026", "receipt.method": "Visa ending 4242", "receipt.amount": "637 kr.", "receipt.url": "https://koldingtees.dk/r/…" },
  },
  {
    key: "invoice-due",
    name: "Invoice reminder",
    about: "A polite nudge about an unpaid invoice.",
    icon: "clipboard",
    group: "Billing",
    alias: "invoice-reminder",
    subject: "Invoice {{invoice.number}} is due {{invoice.due}}",
    html: layout(`      <p style="margin:0 0 12px">Hi {{name|there}},</p>
      <p style="margin:0 0 12px">A friendly reminder that invoice {{invoice.number}} of <b>{{invoice.amount}}</b> is due {{invoice.due}}. If you've already paid, thank you, and please ignore this.</p>
${button("{{invoice.url}}", "See and pay the invoice")}`),
    text: "Hi {{name|there}},\n\nA friendly reminder that invoice {{invoice.number}} of {{invoice.amount}} is due {{invoice.due}}. If you've already paid, thank you, and please ignore this.\n\nSee and pay: {{invoice.url}}\n\n— {{brand|Your company}}",
    sample: { brand: "Kolding Autoservice", name: "Bo", "invoice.number": "1042", "invoice.amount": "7.537,50 kr.", "invoice.due": "on 24 November", "invoice.url": "https://koldingauto.dk/i/…" },
  },
  {
    key: "newsletter",
    name: "Newsletter",
    about: "A headline, a few lines and a link, with unsubscribe.",
    icon: "mega",
    group: "Other",
    alias: "newsletter",
    subject: "{{headline}}",
    html: layout(`      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3">{{headline}}</h1>
      <p style="margin:0 0 12px">{{intro}}</p>
      {{{body_html}}}
${button("{{url}}", "{{cta|Read more}}")}`, "You get this because you signed up for news from {{brand|us}}. <a href=\"{{unsubscribe_url}}\" style=\"color:#71717a\">Unsubscribe</a>."),
    text: "{{headline}}\n\n{{intro}}\n\n{{body_text}}\n\n{{cta|Read more}}: {{url}}\n\nUnsubscribe: {{unsubscribe_url}}\n\n— {{brand|Your company}}",
    sample: {
      ...BRAND,
      headline: "Drop 08 is here",
      intro: "Three new colours, printed in Kolding, in small runs.",
      body_html: '<p style="margin:0 0 12px">Members get 48 hours first. Everyone else from Friday at 10.</p>',
      body_text: "Members get 48 hours first. Everyone else from Friday at 10.",
      url: "https://koldingtees.dk/drop-08",
      cta: "See the drop",
      unsubscribe_url: "https://koldingtees.dk/unsubscribe/…",
    },
  },
  {
    key: "contact-received",
    name: "We got your message",
    about: "Auto-reply to a contact form or support email.",
    icon: "inbox",
    group: "Other",
    alias: "contact-received",
    subject: "We got your message",
    html: layout(`      <p style="margin:0 0 12px">Hi {{name|there}},</p>
      <p style="margin:0 0 12px">Thanks for writing. We usually answer within {{response_time|one working day}}.</p>
      <p style="margin:0 0 12px;color:#71717a">Your case: {{ticket|—}}</p>`, "You get this email because you contacted {{brand|us}}."),
    text: "Hi {{name|there}},\n\nThanks for writing. We usually answer within {{response_time|one working day}}.\nYour case: {{ticket|—}}\n\n— {{brand|Your company}}",
    sample: { ...BRAND, name: "Sofie", response_time: "one working day", ticket: "Q-T21" },
  },
];

const GROUPS = ["Account", "Shop", "Bookings", "Billing", "Other"];

/** {"order.total": "9"} → { order: { total: "9" } }, the shape dotted variables read. */
function nest(flat) {
  const out = {};
  for (const k of Object.keys(flat)) {
    const parts = k.split('.');
    let o = out;
    for (const p of parts.slice(0, -1)) o = o[p] = o[p] && typeof o[p] === 'object' ? o[p] : {};
    o[parts[parts.length - 1]] = flat[k];
  }
  return out;
}

const list = LIST.map((p) => Object.freeze({ key: p.key, name: p.name, about: p.about, group: p.group, alias: p.alias, subject: p.subject, html: p.html, text: p.text, sample: nest(p.sample) }));
/** Every preset by key, camelCased too: presets['order-confirmation'] and presets.orderConfirmation. */
const presets = {};
for (const p of list) {
  presets[p.key] = p;
  presets[p.key.replace(/-([a-z])/g, (_m, c) => c.toUpperCase())] = p;
}

module.exports = { presets, presetList: list, presetGroups: GROUPS };
