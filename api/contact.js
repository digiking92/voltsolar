function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function authHeader(token) {
  const trimmed = String(token).trim().replace(/^"|"$/g, '');
  if (/^zoho-enczapikey\s+/i.test(trimmed)) return trimmed;
  return `Zoho-enczapikey ${trimmed}`;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function getAllowedOrigin(req) {
  const requestOrigin = req.headers.origin || '';
  const configured = (process.env.CONTACT_ALLOWED_ORIGINS || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

  const defaults = [
    'https://voltsolar.learnwithchris.app',
    'https://voltsolar-dun.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];

  const allowlist = configured.length ? configured : defaults;
  if (requestOrigin && allowlist.includes(requestOrigin)) {
    return requestOrigin;
  }
  return allowlist[0];
}

// Simple in-memory rate limit (best-effort on serverless; still blocks burst abuse)
const rateBuckets = globalThis.__voltsolarContactRate || new Map();
globalThis.__voltsolarContactRate = rateBuckets;

function checkRateLimit(ip) {
  const windowMs = 10 * 60 * 1000;
  const maxHits = 8;
  const now = Date.now();
  let entry = rateBuckets.get(ip) || { count: 0, start: now };
  if (now - entry.start > windowMs) {
    entry = { count: 0, start: now };
  }
  entry.count += 1;
  rateBuckets.set(ip, entry);
  return entry.count <= maxHits;
}

function validateContactPayload(body) {
  if (!body || typeof body !== 'object') return 'Invalid request body.';

  // Honeypot: bots fill hidden fields
  if (String(body.website || body.companyUrl || '').trim()) {
    return { honeypot: true };
  }

  const fullName = String(body.fullName || '').trim();
  const email = String(body.email || '').trim();
  const intent = String(body.intent || '').trim();
  const summary = String(body.summary || '').trim();
  const company = String(body.company || '').trim();
  const phone = String(body.phone || '').trim();
  const budget = String(body.budget || '').trim();

  if (!fullName || !email || !intent || !summary) {
    return 'Please complete name, email, inquiry type, and project summary.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Please provide a valid email address.';
  }
  if (summary.length > 5000 || fullName.length > 120) {
    return 'Message is too long. Please shorten and try again.';
  }

  return { fullName, email, intent, summary, company, phone, budget };
}

async function sendContactEmail(payload) {
  const token = (process.env.ZEPTOMAIL_TOKEN || '').trim();
  const fromEmail = (process.env.ZEPTOMAIL_FROM_EMAIL || '').trim() || 'voltsolar@learnwithchris.app';
  const fromName = (process.env.ZEPTOMAIL_FROM_NAME || '').trim() || 'VoltSolar';
  const toEmail = (process.env.CONTACT_TO_EMAIL || '').trim() || 'frohitedigitals@gmail.com';
  const apiUrl = (process.env.ZEPTOMAIL_API_URL || '').trim() || 'https://api.zeptomail.com/v1.1/email';

  if (!token) {
    throw new Error('Email service is not configured.');
  }

  const rows = [
    ['Name', payload.fullName],
    ['Email', payload.email],
    ['Phone', payload.phone || '-'],
    ['Company', payload.company || '-'],
    ['Inquiry type', payload.intent],
    ['Budget', payload.budget || '-']
  ];

  const htmlbody =
    '<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">' +
    '<h2 style="color:#123A63;margin:0 0 12px">New VoltSolar contact inquiry</h2>' +
    '<p style="margin:0 0 16px;color:#475569">Submitted from the website contact form.</p>' +
    '<table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:640px">' +
    rows
      .map(row => {
        return (
          '<tr><td style="border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;width:160px">' +
          escapeHtml(row[0]) +
          '</td><td style="border:1px solid #e2e8f0">' +
          escapeHtml(row[1]) +
          '</td></tr>'
        );
      })
      .join('') +
    '</table>' +
    '<h3 style="margin:20px 0 8px;color:#123A63">Project summary</h3>' +
    '<p style="white-space:pre-wrap;margin:0;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">' +
    escapeHtml(payload.summary) +
    '</p></div>';

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: authHeader(token)
    },
    body: JSON.stringify({
      from: { address: fromEmail, name: fromName },
      to: [{ email_address: { address: toEmail, name: 'VoltSolar Inbox' } }],
      reply_to: [{ address: payload.email, name: payload.fullName }],
      subject: `[VoltSolar] ${payload.intent} - ${payload.fullName}`,
      htmlbody
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('ZeptoMail error:', response.status, detail);
    throw new Error('Could not send your message right now. Please try again later.');
  }
}

export default async function handler(req, res) {
  const allowedOrigin = getAllowedOrigin(req);
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const ip = getClientIp(req);
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: 'Too many requests. Please wait and try again.' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
    const validated = validateContactPayload(body);
    if (validated && validated.honeypot) {
      return res.status(200).json({ ok: true });
    }
    if (typeof validated === 'string') {
      return res.status(400).json({ error: validated });
    }

    await sendContactEmail(validated);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact API error:', err);
    return res.status(500).json({
      error: 'Could not send your message. Please try again or email frohitedigitals@gmail.com.'
    });
  }
}
