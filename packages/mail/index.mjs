// ES module entry: import { CartiqoMail, presets, verifyWebhook } from '@cartiqo/mail';
import mail from './index.js';

export const { CartiqoMail, CartiqoError, createClient, verifyWebhook, signWebhook, renderTemplate, variablesOf, presets, presetList, presetGroups, VERSION, DEFAULT_BASE_URL } = mail;
export default mail.CartiqoMail;
