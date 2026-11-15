export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  dob: string | null; // yyyy-mm-dd
  height_in: number | null;
  weight_lb: number | null;
  sport: string | null;
  injuries: string | null;
  goals: string | null;
  guardian_name: string | null;
  guardian_email: string | null;
  guardian_phone: string | null;
  consent: boolean;
  created_at: string;
}

export interface Scan {
  id: string;
  client_id: string;
  performed_at: string;
  fails: string[];
  skipped: string[];
  notes: Record<string, string>; // movement key -> note
  total_pct: number;
  retest_due: string; // yyyy-mm-dd
  report_sent_at: string | null;
}

export type NewClient = Omit<Client, "id" | "created_at">;
export type NewScan = Omit<Scan, "id" | "report_sent_at">;

export const RETEST_DAYS = 90;

export const fullName = (c: Pick<Client, "first_name" | "last_name">) =>
  `${c.first_name} ${c.last_name}`.trim();

export function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob + "T00:00:00");
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export const isMinor = (c: Pick<Client, "dob">) => {
  const a = ageFromDob(c.dob);
  return a !== null && a < 18;
};

// Where reports and reminders go: the parent for minors, otherwise the client.
export const contactFor = (c: Client) =>
  isMinor(c) && c.guardian_email
    ? { name: c.guardian_name || fullName(c), email: c.guardian_email, phone: c.guardian_phone }
    : { name: c.first_name, email: c.email, phone: c.phone };

export function addDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const todayISO = () => new Date().toISOString().slice(0, 10);

export function retestStatus(due: string): "overdue" | "due_soon" | "ok" {
  const today = todayISO();
  if (due < today) return "overdue";
  if (due <= addDays(today, 7)) return "due_soon";
  return "ok";
}

export interface TeamMember {
  name: string;
  email: string;
  role: "Owner" | "Trainer";
}

export interface GymSettings {
  gymName: string;
  ownerName: string;
  assessmentPrice: number; // what the gym charges an athlete per scan
  plan: "studio" | "performance" | "elite" | null;
  planStartedAt: string | null;
  mapping: Record<string, string[]> | null; // null = starter library
  team: TeamMember[];
}

export const DEFAULT_SETTINGS: GymSettings = {
  gymName: "Your Gym",
  ownerName: "",
  assessmentPrice: 75,
  plan: null,
  planStartedAt: null,
  mapping: null,
  team: [],
};
