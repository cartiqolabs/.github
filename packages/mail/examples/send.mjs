// node examples/send.mjs  (with CARTIQO_API_KEY set, and a domain verified in Mail → Settings → Domains)
import { CartiqoMail } from '@cartiqo/mail';

const mail = new CartiqoMail();

const { id, status } = await mail.emails.send({
  from: 'Kolding Tees <hello@koldingtees.dk>',
  to: 'sofie@example.com',
  subject: 'Your order #1042',
  html: '<p>Thanks for your order. It ships tomorrow.</p>',
});
console.log(id, status);
