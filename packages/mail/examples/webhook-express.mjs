// A webhook endpoint with Express. Add https://yourshop.dk/webhooks/cartiqo in Mail → Settings → Webhooks and put its
// signing secret in CARTIQO_WEBHOOK_SECRET.
import express from 'express';
import { verifyWebhook, CartiqoError } from '@cartiqo/mail';

const app = express();

// The raw body: the signature is over the exact bytes, before JSON.parse.
app.post('/webhooks/cartiqo', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    const event = verifyWebhook(req.body, req.headers['cartiqo-signature'], process.env.CARTIQO_WEBHOOK_SECRET);
    if (event.type === 'email.bounced') console.log('Bounced:', event.data.to);
    res.sendStatus(200);
  } catch (e) {
    if (e instanceof CartiqoError) return res.status(400).send(e.message);
    throw e;
  }
});

app.listen(3000);
