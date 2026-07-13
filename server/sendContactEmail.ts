export type ContactPayload = {
  fullName: string;
  company?: string;
  email: string;
  phone?: string;
  intent: string;
  summary: string;
  budget?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function authHeader(token: string): string {
  const trimmed = token.trim();
  if (/^zoho-enczapikey\s+/i.test(trimmed)) return trimmed;
  return `Zoho-enczapikey ${trimmed}`;
}

export function validateContactPayload(body: unknown): ContactPayload | string {
  if (!body || typeof body !== 'object') return 'Invalid request body.';
  const data = body as Record<string, unknown>;

  const fullName = String(data.fullName ?? '').trim();
  const email = String(data.email ?? '').trim();
  const intent = String(data.intent ?? '').trim();
  const summary = String(data.summary ?? '').trim();
  const company = String(data.company ?? '').trim();
  const phone = String(data.phone ?? '').trim();
  const budget = String(data.budget ?? '').trim();

  if (!fullName || !email || !intent || !summary) {
    return 'Please complete name, email, inquiry type, and project summary.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Please provide a valid email address.';
  }

  return { fullName, email, intent, summary, company, phone, budget };
}

export async function sendContactEmail(payload: ContactPayload): Promise<void> {
  const token = process.env.ZEPTOMAIL_TOKEN?.trim();
  const fromEmail = process.env.ZEPTOMAIL_FROM_EMAIL?.trim() || 'voltsolar@learnwithchris.app';
  const fromName = process.env.ZEPTOMAIL_FROM_NAME?.trim() || 'VoltSolar';
  const toEmail = process.env.CONTACT_TO_EMAIL?.trim() || 'frohitedigitals@gmail.com';
  const apiUrl = process.env.ZEPTOMAIL_API_URL?.trim() || 'https://api.zeptomail.com/v1.1/email';

  if (!token) {
    throw new Error('ZEPTOMAIL_TOKEN is not configured on the server.');
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
    throw new Error('Failed to send email via ZeptoMail.');
  }
}

export async function readJsonBody(req: { on: Function }): Promise<unknown> {
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    req.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve());
    req.on('error', reject);
  });
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}
