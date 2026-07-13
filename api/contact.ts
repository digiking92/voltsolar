import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendContactEmail, validateContactPayload } from '../server/sendContactEmail';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const validated = validateContactPayload(req.body);
    if (typeof validated === 'string') {
      return res.status(400).json({ error: validated });
    }

    await sendContactEmail(validated);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact API error:', err);
    const message =
      err instanceof Error && err.message.includes('not configured')
        ? err.message
        : 'Could not send your message. Please try again or email us directly.';
    return res.status(500).json({ error: message });
  }
}
