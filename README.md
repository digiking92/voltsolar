# VoltSolar

Intelligent solar system design platform for installers, engineers, and EPC teams.

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS 4
- Supabase Auth + Postgres
- Motion + Lenis for marketing UX
- Vercel for hosting and `/api/contact`

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000`.

### Required env

**Client**

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Server (contact form)**

- `ZEPTOMAIL_TOKEN` (required to send mail)
- `ZEPTOMAIL_FROM_EMAIL` / `ZEPTOMAIL_FROM_NAME` (optional)
- `CONTACT_TO_EMAIL` (optional)
- `CONTACT_ALLOWED_ORIGINS` (optional comma-separated CORS allowlist)
- `ZEPTOMAIL_API_URL` (optional region override)

## Scripts

- `npm run dev` – local development
- `npm run build` – production build
- `npm run preview` – preview build
- `npm run lint` – TypeScript check

## Routes

- `/` homepage
- `/about` `/contact` `/privacy` `/terms`
- `/login` `/signup`
- `/app` authenticated workspace

## Security notes

- Auth requires a real Supabase session (no offline login bypass).
- Enable RLS on `profiles` and `projects` so users only access their own rows. See SQL comments in `src/lib/supabase.ts`.
