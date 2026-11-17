// Types for @cartiqo/mail. The Mail API reference: https://cartiqo.email/mail/docs
export declare const VERSION: string;

export type EmailStatus = "scheduled" | "queued" | "sent" | "delivered" | "bounced" | "complained" | "failed" | "canceled" | "suppressed";

export type WebhookEventType =
  | "email.scheduled"
  | "email.sent"
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.bounced"
  | "email.complained"
  | "email.failed"
  | "email.canceled"
  | "email.suppressed";

/** Stable error codes. New ones may be added, so keep a default branch. */
export type ErrorCode =
  | "missing_api_key"
  | "invalid_api_key"
  | "insufficient_permission"
  | "invalid_input"
  | "invalid_from"
  | "invalid_recipient"
  | "too_many_recipients"
  | "invalid_cursor"
  | "invalid_idempotency_key"
  | "domain_not_added"
  | "domain_not_verified"
  | "email_not_found"
  | "template_not_found"
  | "not_found"
  | "alias_taken"
  | "template_limit"
  | "not_scheduled"
  | "idempotency_in_progress"
  | "idempotency_key_reused"
  | "missing_variables"
  | "recipient_suppressed"
  | "monthly_quota"
  | "daily_quota"
  | "rate_limited"
  | "send_failed"
  | "invalid_signature"
  | "network_error"
  | (string & {});

export interface SendEmail {
  /** "orders@yourshop.dk" or "Shop <orders@yourshop.dk>", on a domain you've verified. */
  from: string;
  /** Up to 50 recipients. */
  to: string | string[];
  /** Required unless the template has one. */
  subject?: string;
  html?: string;
  text?: string;
  /** A template's id (tpl_…) or alias. Don't send html or text with it. */
  template?: string;
  variables?: Record<string, unknown>;
  /** ISO 8601 string or Date, up to 30 days ahead. */
  scheduled_at?: string | Date;
  scheduledAt?: string | Date;
  /** Up to 10 labels of up to 40 characters. */
  tags?: string[];
  reply_to?: string;
  replyTo?: string;
}

export interface SendOptions {
  /** Defaults to a random UUID per call. Pass your own (e.g. your order id) to make retries across processes safe. */
  idempotencyKey?: string;
}

export interface SendResult {
  id: string;
  status: EmailStatus;
  scheduled_at?: string;
  /** Recipients left out because they're on your suppression list. */
  suppressed?: string[];
  error?: string;
}

export interface EmailEvent {
  type: "scheduled" | "sent" | "delivered" | "delivery_delayed" | "bounced" | "complained" | "failed" | "canceled" | "suppressed";
  recipient: string | null;
  detail: string | null;
  created_at: string;
}

export interface EmailSummary {
  id: string;
  from: string;
  to: string[];
  subject: string;
  status: EmailStatus;
  error: string | null;
  tags: string[];
  /** The template id it was made from, or null. */
  template: string | null;
  created_at: string;
  scheduled_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
}

export interface Email extends EmailSummary {
  events: EmailEvent[];
}

export interface ListEmailsParams {
  status?: EmailStatus;
  tag?: string;
  /** One recipient address. */
  to?: string;
  /** Matches recipient, subject or id. */
  q?: string;
  since?: string | Date;
  until?: string | Date;
  /** 1–100, default 20. */
  limit?: number;
  /** next_cursor of the previous page. */
  startingAfter?: string;
  starting_after?: string;
}

export interface Page<T> {
  data: T[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface Template {
  id: string;
  name: string;
  alias: string | null;
  subject: string;
  html: string | null;
  text: string | null;
  /** Variable names used in the subject, html and text. */
  variables: string[];
  created_at: string;
  updated_at: string;
}

export interface TemplateInput {
  name: string;
  /** Letters, numbers, dashes and underscores; send with it instead of the id. */
  alias?: string | null;
  subject: string;
  html?: string | null;
  text?: string | null;
}

export interface RenderedTemplate {
  subject: string;
  html: string | null;
  text: string | null;
  /** Variables with no value and no fallback. Sending with these missing answers 422 missing_variables. */
  missing_variables: string[];
}

export interface RateLimit {
  limit: number;
  remaining: number;
  /** Seconds until the window resets. */
  reset: number;
}

export interface WebhookEvent<T = Record<string, unknown>> {
  id: string;
  type: WebhookEventType;
  created_at: string;
  data: T & { email_id?: string; from?: string; to?: string[]; subject?: string; tags?: string[] };
}

export declare class CartiqoError extends Error {
  /** HTTP status, or 0 when the API couldn't be reached. */
  status: number;
  code: ErrorCode | null;
  body: unknown;
  /** Seconds from the Retry-After header, on 429. */
  retryAfter: number | null;
}

export interface ClientOptions {
  /** Default https://api.cartiqo.app, or the CARTIQO_API_URL environment variable. */
  baseUrl?: string;
  fetch?: typeof fetch;
  /** Retries for network errors, 429 and 5xx (not 502). Default 2. */
  maxRetries?: number;
  /** Milliseconds per attempt. Default 30000. */
  timeout?: number;
}

export declare class CartiqoMail {
  /** apiKey defaults to the CARTIQO_API_KEY environment variable. */
  constructor(apiKey?: string, options?: ClientOptions);
  rateLimit: RateLimit | null;
  emails: {
    send(email: SendEmail, options?: SendOptions): Promise<SendResult>;
    /** Up to 100 emails. If one is wrong, none are sent. */
    batch(emails: SendEmail[], options?: SendOptions): Promise<{ data: SendResult[] }>;
    /** Needs a Full access key. */
    get(id: string): Promise<Email>;
    /** Needs a Full access key. */
    list(params?: ListEmailsParams): Promise<Page<EmailSummary>>;
    /** Every matching email, fetching pages as you go. Needs a Full access key. */
    iterate(params?: ListEmailsParams): AsyncGenerator<EmailSummary, void, undefined>;
    cancel(id: string): Promise<{ id: string; status: "canceled" }>;
    reschedule(id: string, scheduledAt: string | Date): Promise<{ id: string; status: "scheduled"; scheduled_at: string }>;
  };
  /** All template calls need a Full access key. `ref` is the id (tpl_…) or alias. */
  templates: {
    list(): Promise<{ data: Template[] }>;
    get(ref: string): Promise<Template>;
    /** A template, or a preset from this package: create(presets.receipt). */
    create(template: TemplateInput | TemplatePreset): Promise<Template>;
    update(ref: string, changes: Partial<TemplateInput>): Promise<Template>;
    delete(ref: string): Promise<{ id: string; deleted: true }>;
    render(ref: string, variables?: Record<string, unknown>): Promise<RenderedTemplate>;
  };
  request<T = unknown>(method: string, path: string, body?: unknown, options?: { idempotencyKey?: string }): Promise<T>;
}

export declare function verifyWebhook<T = Record<string, unknown>>(rawBody: string | Uint8Array, signatureHeader: string | null | undefined, secret: string, toleranceSec?: number): WebhookEvent<T>;

export declare function signWebhook(rawBody: string | object, secret: string, timestamp?: number): string;

/** The same as new CartiqoMail(apiKey, options). */
export declare function createClient(apiKey?: string, options?: ClientOptions): CartiqoMail;

export type PresetGroup = "Account" | "Shop" | "Bookings" | "Billing" | "Other";

/** A ready-made template. Create it as it is, or change any field first. */
export interface TemplatePreset {
  key: string;
  name: string;
  /** One line about what it's for. */
  about: string;
  group: PresetGroup;
  alias: string;
  subject: string;
  html: string;
  text: string;
  /** Values that make the preview read like a real email. */
  sample: Record<string, unknown>;
}

export type PresetKey =
  | "signup-code" | "welcome" | "password-reset" | "magic-link" | "team-invite"
  | "order-confirmation" | "shipped" | "abandoned-cart"
  | "booking-confirmation" | "booking-reminder"
  | "receipt" | "invoice-due"
  | "newsletter" | "contact-received";

/** Every preset by key, also camelCased: presets["order-confirmation"] and presets.orderConfirmation. */
export declare const presets: Record<PresetKey, TemplatePreset> & {
  signupCode: TemplatePreset; welcome: TemplatePreset; passwordReset: TemplatePreset; magicLink: TemplatePreset; teamInvite: TemplatePreset;
  orderConfirmation: TemplatePreset; shipped: TemplatePreset; abandonedCart: TemplatePreset;
  bookingConfirmation: TemplatePreset; bookingReminder: TemplatePreset;
  receipt: TemplatePreset; invoiceDue: TemplatePreset;
  newsletter: TemplatePreset; contactReceived: TemplatePreset;
};
export declare const presetList: readonly TemplatePreset[];
export declare const presetGroups: readonly PresetGroup[];

export interface LocalRender {
  subject: string;
  html: string | null;
  text: string | null;
  /** Variables with no value and no fallback. */
  missing: string[];
}
/** Fill a template the way the Mail API does, without a request. */
export declare function renderTemplate(template: { subject: string; html?: string | null; text?: string | null }, variables?: Record<string, unknown>): LocalRender;
/** The variable names a template uses, in order of first use. */
export declare function variablesOf(template: { subject?: string; html?: string | null; text?: string | null }): string[];

export declare const DEFAULT_BASE_URL: string;

export default CartiqoMail;
