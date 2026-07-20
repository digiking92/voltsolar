/**
 * Lightweight Supabase ping so free-tier projects don't pause after inactivity.
 * Invoked daily by Vercel Cron (see vercel.json).
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const cronSecret = (process.env.CRON_SECRET || '').trim();
  if (cronSecret) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ''
  ).trim().replace(/\/$/, '');
  const supabaseKey = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (!supabaseUrl || !supabaseKey) {
    console.error('keep-alive: missing Supabase URL or anon key');
    return res.status(500).json({ ok: false, error: 'Supabase is not configured.' });
  }

  try {
    // Cheap read against PostgREST — enough activity to avoid project pause.
    const response = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=id&limit=1`,
      {
        method: 'GET',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: 'application/json'
        }
      }
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('keep-alive: Supabase ping failed', response.status, detail);
      return res.status(502).json({
        ok: false,
        error: 'Supabase ping failed',
        status: response.status
      });
    }

    return res.status(200).json({
      ok: true,
      message: 'Supabase keep-alive ping succeeded',
      at: new Date().toISOString()
    });
  } catch (err) {
    console.error('keep-alive: unexpected error', err);
    return res.status(500).json({ ok: false, error: 'Keep-alive failed.' });
  }
}
