'use strict';

// CommonJS entry: const { CartiqoMail, presets, verifyWebhook } = require('@cartiqo/mail');
const { CartiqoMail, VERSION, DEFAULT_BASE_URL } = require('./lib/client.js');
const { CartiqoError } = require('./lib/errors.js');
const { verifyWebhook, signWebhook } = require('./lib/webhook.js');
const { renderTemplate, variablesOf } = require('./lib/render.js');
const { presets, presetList, presetGroups } = require('./lib/presets.js');

/** The same as new CartiqoMail(apiKey, options). */
const createClient = (apiKey, options) => new CartiqoMail(apiKey, options);

module.exports = {
  CartiqoMail,
  CartiqoError,
  createClient,
  verifyWebhook,
  signWebhook,
  renderTemplate,
  variablesOf,
  presets,
  presetList,
  presetGroups,
  VERSION,
  DEFAULT_BASE_URL,
};
module.exports.default = CartiqoMail;
