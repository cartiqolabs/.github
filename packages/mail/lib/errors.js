'use strict';

/** An error from the Mail API (or this package): `message` says how to fix it, `code` is stable to branch on. */
class CartiqoError extends Error {
  constructor(status, message, code, body, retryAfter) {
    super(message);
    this.name = 'CartiqoError';
    this.status = status;
    this.code = code || null;
    this.body = body || null;
    this.retryAfter = retryAfter || null;
  }
}

module.exports = { CartiqoError };
