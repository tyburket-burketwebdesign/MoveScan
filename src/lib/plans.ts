// What trainers pay for the platform. No license fee: a rate per active athlete that drops as the
// roster grows, an optional flat Pro add-on, and a small platform fee on payments run through the app.
// Billing is not connected yet: choosing a plan records it and starts a trial.
export type PlanKey = "core" | "pro";

export const ATHLETE_TIERS = [
  { upTo: 25, rate: 5.99 },
  { upTo: 100, rate: 3.99 },
  { upTo: Infinity, rate: 2.49 },
];
export const PRO_PRICE = 99;
export const PLATFORM_FEE_PCT = 0.5; // on top of the card processor's own rate
export const CARD_PCT = 2.9;
export const CARD_FIXED = 0.3;
export const TRIAL_DAYS = 30;

const round2 = (n: number) => Math.round(n * 100) / 100;

// Graduated: the first 25 athletes at the first rate, the next 75 at the second, and so on.
export function athleteFees(athletes: number) {
  let total = 0;
  let prev = 0;
  for (const t of ATHLETE_TIERS) {
    total += Math.max(0, Math.min(athletes, t.upTo) - prev) * t.rate;
    prev = t.upTo;
    if (athletes <= t.upTo) break;
  }
  return round2(total);
}

export function platformBill(athletes: number, plan: PlanKey | null) {
  const perAthlete = athleteFees(athletes);
  const base = plan === "pro" ? PRO_PRICE : 0;
  return { perAthlete, base, total: round2(perAthlete + base), effective: athletes ? round2((perAthlete + base) / athletes) : 0 };
}

// What an athlete payment costs the trainer all in, and the platform's share of it.
export function processingFee(amount: number) {
  const processor = round2((amount * CARD_PCT) / 100 + CARD_FIXED);
  const platform = round2((amount * PLATFORM_FEE_PCT) / 100);
  return { processor, platform, total: round2(processor + platform), net: round2(amount - processor - platform) };
}

export const PLANS: { key: PlanKey; name: string; price: string; unit: string; pitch: string; features: string[] }[] = [
  {
    key: "core",
    name: "Core",
    price: "$5.99",
    unit: "per athlete / month",
    pitch: "Everything you need to run your athletes. No license fee, ever.",
    features: [
      "Movement scans with thermal body maps",
      "Program builder and exercise library",
      "Athlete app with workout check-offs",
      "Memberships, invoices and online payments",
      "Automatic retest reminders",
      "Rate drops to $3.99 after 25 athletes, $2.49 after 100",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: "$99",
    unit: "a month + athlete rate",
    pitch: "For gyms with a staff and a brand to protect.",
    features: [
      "Everything in Core",
      "Your logo and colors in the athlete app",
      "Unlimited coaches",
      "Upload and host your own exercise videos",
      "Teams, groups and team heat maps",
      "Custom test batteries",
      "Failed-payment recovery and missed-session nudges",
      "Revenue and retention reporting",
    ],
  },
];
