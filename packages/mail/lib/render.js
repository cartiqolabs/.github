'use strict';

// The template language, exactly as the Mail API fills it in (products/mail/api/templates.ts in cartiqolabs/cartiqo),
// so you can preview a template without a request:
//   {{name}}         the variable, HTML-escaped in html
//   {{{name}}}       the variable as is (for html you build yourself)
//   {{name|there}}   with a fallback when the variable is missing
//   {{order.total}}  dotted paths reach into objects
const TAG = /\{\{(\{?)\s*([A-Za-z_][\w.-]*)\s*(?:\|([^}]*))?\}?\}\}/g;

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function lookup(vars, path) {
  let v = vars;
  for (const part of path.split('.')) {
    if (v === null || typeof v !== 'object') return undefined;
    v = v[part];
  }
  return v;
}

function fill(tpl, vars, html, missing) {
  return tpl.replace(TAG, (_m, raw, name, fallback) => {
    const v = lookup(vars, name);
    let s;
    if (v === undefined || v === null || v === '') {
      if (fallback === undefined) {
        missing.add(name);
        return '';
      }
      s = fallback.trim().replace(/^(["'])(.*)\1$/, '$2');
    } else s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return html && !raw ? escapeHtml(s) : s;
  });
}

/** The variable names a template uses, in order of first use. */
function variablesOf(template) {
  const names = new Set();
  for (const part of [template.subject, template.html, template.text]) {
    for (const m of String(part || '').matchAll(TAG)) names.add(m[2]);
  }
  return [...names];
}

/**
 * Fill a template (or preset) the way the Mail API would: { subject, html, text, missing }. `missing` lists the
 * variables with no value and no fallback; sending without them fails with missing_variables.
 */
function renderTemplate(template, variables) {
  const vars = variables || {};
  const missing = new Set();
  const out = {
    subject: fill(String(template.subject || ''), vars, false, missing).replace(/[\r\n]+/g, ' ').slice(0, 255),
    html: template.html ? fill(template.html, vars, true, missing) : null,
    text: template.text ? fill(template.text, vars, false, missing) : null,
  };
  return Object.assign(out, { missing: [...missing] });
}

module.exports = { renderTemplate, variablesOf };
