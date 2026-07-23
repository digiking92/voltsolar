/**
 * Lightweight Supabase ping so free-tier projects don't pause after inactivity.
 * Invoked daily by Vercel Cron (see vercel.json).
 *
 * Note: Any successful HTTP round-trip to PostgREST counts as project activity,
 * including RLS-denied responses (still hit the database).
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
          Accept: 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );

    const detail = await response.text().catch(() => '');

    // 2xx / 4xx both mean Supabase received the request (activity registered).
    // Only treat network-level / 5xx / paused-project failures as hard errors.
    const reachedSupabase = response.status > 0 && response.status < 500;
    if (!reachedSupabase) {
      console.error('keep-alive: Supabase ping failed', response.status, detail);
      return res.status(502).json({
        ok: false,
        error: 'Supabase ping failed (project may be paused)',
        status: response.status
      });
    }

    if (!response.ok) {
      console.warn('keep-alive: Supabase responded non-OK but was reached', response.status, detail);
    }

    return res.status(200).json({
      ok: true,
      message: 'Supabase keep-alive ping succeeded',
      supabaseStatus: response.status,
      at: new Date().toISOString()
    });
  } catch (err) {
    console.error('keep-alive: unexpected error', err);
    return res.status(500).json({ ok: false, error: 'Keep-alive failed.' });
  }
}
