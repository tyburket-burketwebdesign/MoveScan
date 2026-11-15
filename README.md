# MoveScan

Live: https://move-scan-sand.vercel.app

Movement efficiency assessments for trainers. Built for iPad first, works on phone and desktop.
Install it on the iPad by opening the site in Safari, then Share → Add to Home Screen.

- **Scan flow**: client intake (parent contact required for under 18s), six movement tests with
  big R / L / whole-body toggles, live scoring, skip-test for injuries, notes, review.
- **Results**: front and back body heatmap (tap a region to see what failed there), score rings for
  total / right / left / synergy, movement bars, change since last scan.
- **Reports**: email to the client or parent with a private results link. Print to PDF from the results page.
- **Corrective programs**: every compensation maps to exercises in four phases (release, mobilize,
  activate, integrate). Each scan builds a ranked program automatically. Gyms edit the map in Programs.
- **Owner dashboard**: scans this month, average score and gain on retest, retest compliance, scan revenue,
  and a gym-wide heat signature.
- **Plans**: Studio $149, Performance $299, Elite $599 a month (Settings). Choosing a plan starts a
  14-day trial; billing is not connected yet.
- **Retests**: every scan sets a retest 90 days out. A daily job emails a reminder a week before,
  and the home screen lists who is due or overdue.

## Scoring

Matches Ambrose's spreadsheet exactly (see `src/lib/scoring.test.ts`, which checks two real scans to
the hundredth of a percent). Every compensation is a pass/fail slot, either per side or whole body.
The battery has 60 slots: 24 right, 24 left, 12 whole body. Movement score = passed / possible for that
movement. Total pools every slot, so it is not an average of the movement scores. Skipped tests drop
out of the math instead of counting as fails.

The battery and its body-region map live in `src/lib/battery.ts`.

## Run locally

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # scoring acceptance tests
```

With no env vars set the app runs in **demo mode**: data lives in the browser with two sample
clients. That is also how the first Vercel deploy behaves, so it can be clicked through right away.

## Go live

1. **Supabase**: create a project, open the SQL editor and run `supabase/migrations/0001_init.sql`, then `0002_settings.sql`.
   Under Authentication, add Ambrose as a user (email + password), then run the onboarding snippet at
   the bottom of the migration with his gym name and email.
2. **Resend**: create an API key and verify the gym's sending domain.
3. **Vercel**: import the GitHub repo and add the env vars from `.env.example`
   (Supabase URL, anon key and service role key, `RESEND_API_KEY`, `REPORT_FROM_EMAIL`, `GYM_NAME`,
   `BOOKING_URL`, and a random `CRON_SECRET`). Redeploy. The retest job in `vercel.json` runs daily at 13:00 UTC.

Adding a second gym later: insert a row in `gyms` and a `memberships` row for that trainer.
Row level security keeps each gym's clients and scans separate.

## Stack

Next.js 15 (App Router) · Tailwind 4 · Supabase (Postgres, auth, RLS) · Resend · Vercel

Texting is not built in yet to keep costs down. Phone numbers are still collected at intake, so it can be added later.
