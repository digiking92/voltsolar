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

function validateContactPayload(body) {
  if (!body || typeof body !== 'object') return 'Invalid request body.';

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

  return { fullName, email, intent, summary, company, phone, budget };
}

async function sendContactEmail(payload) {
  const token = (process.env.ZEPTOMAIL_TOKEN || '').trim();
  const fromEmail = (process.env.ZEPTOMAIL_FROM_EMAIL || '').trim() || 'voltsolar@learnwithchris.app';
  const fromName = (process.env.ZEPTOMAIL_FROM_NAME || '').trim() || 'VoltSolar';
  const toEmail = (process.env.CONTACT_TO_EMAIL || '').trim() || 'frohitedigitals@gmail.com';
  const apiUrl = (process.env.ZEPTOMAIL_API_URL || '').trim() || 'https://api.zeptomail.com/v1.1/email';

  if (!token) {
    throw new Error('ZEPTOMAIL_TOKEN is missing in Vercel environment variables.');
  }

  const rows = [
    ['Name', payload.fullName],
    ['Email', payload.email],
    ['Phone', payload.phone || '-'],
    ['Company', payload.company || '-'],
    ['Inquiry type', payload.intent],
    ['Budget', payload.budget || '-']
  ];

  const htmlbody = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
      <h2 style="color:#123A63;margin:0 0 12px">New VoltSolar contact inquiry</h2>
      <p style="margin:0 0 16px;color:#475569">Submitted from the website contact form.</p>
      <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:640px">
        ${rows
          .map(
            ([label, value]) => `
          <tr>
            <td style="border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;width:160px">${escapeHtml(label)}</td>
            <td style="border:1px solid #e2e8f0">${escapeHtml(value)}</td>
          </tr>`
          )
          .join('')}
      </table>
      <h3 style="margin:20px 0 8px;color:#123A63">Project summary</h3>
      <p style="white-space:pre-wrap;margin:0;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">${escapeHtml(payload.summary)}</p>
    </div>
  `;

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
    let zeptoMessage = 'ZeptoMail rejected the email. Check token, from-address, and region.';
    try {
      const parsed = JSON.parse(detail);
      zeptoMessage =
        (parsed.error && parsed.error.details && parsed.error.details[0] && parsed.error.details[0].message) ||
        (parsed.error && parsed.error.message) ||
        zeptoMessage;
    } catch (_) {
      // keep default
    }
    throw new Error(zeptoMessage);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
    const validated = validateContactPayload(body);
    if (typeof validated === 'string') {
      return res.status(400).json({ error: validated });
    }

    await sendContactEmail(validated);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact API error:', err);
    const message = err && err.message ? err.message : 'Could not send your message. Please try again.';
    return res.status(500).json({ error: message });
  }
}
