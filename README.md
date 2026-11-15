# Tungsten

Live: https://move-scan-sand.vercel.app

The training platform for serious coaches: movement scans, programming, an athlete app and billing in
one place. Built for iPad first; works on phone and desktop. The product name lives in
`src/lib/brand.ts`. Change it there and the app, emails, icons and reports follow.

## What's in it

**Trainer hub**
- **Today**: recurring revenue, sessions checked off this week, average movement score, and one list of
  what needs attention (overdue invoices, athletes missing sessions, retests due).
- **Athletes**: roster with program, membership, adherence and score. Each athlete has Overview,
  Training and Billing tabs, plus a private link to their app.
- **Movement scan**: six tests with R / L / whole-body toggles, live thermal body map, corrective
  program, branded report. Scoring matches the original spreadsheet to the hundredth of a percent.
- **Training**: program builder (weeks, days, sets, reps, load, rest, notes), starter templates,
  an exercise library with demo video links (YouTube, Vimeo or .mp4), one-click "build from scan",
  and the corrective map that drives scan programs.
- **Billing**: membership plans, per-athlete subscriptions that invoice themselves each period,
  one-off invoices, record cash / check payments, printable invoices, emailed invoices.
- **Settings**: gym, athlete-app color, platform plan with a live bill estimate, payouts, team.

**Athlete app** (`/a/<private token>`)
- Today's session, week strip, streak, movement score.
- Workout player: tap off each set, watch the demo, finish with an effort rating and a note.
- Scan: heat map, score, focus areas, progress. Account: membership, invoices, pay, receipts.

## Pricing model (`src/lib/plans.ts`)

- **Core**: $5.99 per active athlete a month for the first 25, $3.99 up to 100, $2.49 after. No license fee.
- **Pro**: $99 a month on top (branding, unlimited coaches, hosted video, teams, automations, reporting).
- **Payments**: 0.5% platform fee on athlete payments, on top of the card processor's 2.9% + 30¢.
- Billing for the platform itself and card charging are **not connected yet**. Choosing a plan starts a
  trial, and "pay" in the athlete app marks an invoice paid without moving money.

## Run locally

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # scoring, program, schedule, billing and pricing tests
```

With no env vars set the app runs in **demo mode**: a sample gym lives in the browser, and the sidebar's
"See the athlete app" opens an athlete with a session waiting. Reset it from the sidebar.

## Go live

1. **Supabase**: create a project and run the files in `supabase/migrations` in order (0001, 0002, 0003).
   Under Authentication, add the trainer as a user, then run the onboarding snippet at the bottom of 0001.
2. **Resend**: create an API key and verify the sending domain (reports, invoices, retest reminders).
3. **Vercel**: add the env vars from `.env.example` and redeploy. The daily job in `vercel.json` creates
   membership invoices and sends retest reminders.

Live mode has not been run against a real database yet; test it end to end before putting real
athletes on it. Athletes reach their app through a private link (no athlete logins yet).

## Stack

Next.js 15 (App Router) · Tailwind 4 · Supabase (Postgres, auth, RLS) · Resend · Vercel
