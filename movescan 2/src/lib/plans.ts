// Subscription tiers. Billing is not connected yet: choosing a plan records it and starts a trial.
export type PlanKey = "studio" | "performance" | "elite";

export const PLANS: { key: PlanKey; name: string; price: number; athletes: number; pitch: string; features: string[] }[] = [
  {
    key: "studio",
    name: "Studio",
    price: 149,
    athletes: 75,
    pitch: "For independent trainers and small studios.",
    features: ["Unlimited scans", "Thermal body map", "Branded athlete reports", "Automatic retest reminders", "1 trainer"],
  },
  {
    key: "performance",
    name: "Performance",
    price: 299,
    athletes: 250,
    pitch: "For performance gyms running assessments every week.",
    features: ["Everything in Studio", "Corrective program engine", "Your own exercise library", "Athlete report with program", "Unlimited trainers", "Owner dashboard"],
  },
  {
    key: "elite",
    name: "Elite",
    price: 599,
    athletes: 750,
    pitch: "For facilities, teams and multi-location groups.",
    features: ["Everything in Performance", "Team rosters and team heat maps", "Multiple locations", "Custom test batteries", "Charge athletes for scans", "Priority onboarding"],
  },
];

export const TRIAL_DAYS = 14;
