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
  portal_token: string; // unguessable key for the athlete's app link
  archived: boolean; // archived athletes are not billed
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

export type NewClient = Omit<Client, "id" | "created_at" | "portal_token" | "archived"> & Partial<Pick<Client, "portal_token" | "archived">>;
export type NewScan = Omit<Scan, "id" | "report_sent_at">;

export const RETEST_DAYS = 90;

export const fullName = (c: Pick<Client, "first_name" | "last_name">) => `${c.first_name} ${c.last_name}`.trim();
export const initials = (c: Pick<Client, "first_name" | "last_name">) => ((c.first_name[0] ?? "") + (c.last_name.replace(/[^a-z]/gi, "")[0] ?? "")).toUpperCase();

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

// Where reports, invoices and reminders go: the parent for minors, otherwise the athlete.
export const contactFor = (c: Client) =>
  isMinor(c) && c.guardian_email
    ? { name: c.guardian_name || fullName(c), email: c.guardian_email, phone: c.guardian_phone }
    : { name: c.first_name, email: c.email, phone: c.phone };

// ---------- dates ----------
// Calendar dates are plain yyyy-mm-dd strings in the viewer's own time zone, and all date math
// runs in UTC so daylight saving changes can never shift a day.
const pad = (n: number) => String(n).padStart(2, "0");
export const localISO = (d: Date = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => localISO();
const parts = (iso: string) => (iso.length > 10 ? localISO(new Date(iso)) : iso).split("-").map(Number) as [number, number, number];

export function addDays(iso: string, days: number) {
  const [y, m, d] = parts(iso);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// Same day next month, clamped to the month's length (Jan 31 -> Feb 28).
export function addMonths(iso: string, months: number) {
  const [y, m, d] = parts(iso);
  const last = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + months, Math.min(d, last))).toISOString().slice(0, 10);
}

export const daysBetween = (a: string, b: string) => {
  const [y1, m1, d1] = parts(a);
  const [y2, m2, d2] = parts(b);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5);
};

// Monday = 0 ... Sunday = 6
export const weekdayOf = (iso: string) => {
  const [y, m, d] = parts(iso);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
};
export const mondayOf = (iso: string) => addDays(iso, -weekdayOf(iso));
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) =>
  new Date(iso.length > 10 ? iso : iso + "T00:00:00").toLocaleDateString(undefined, opts);

export function retestStatus(due: string): "overdue" | "due_soon" | "ok" {
  const today = todayISO();
  if (due < today) return "overdue";
  if (due <= addDays(today, 7)) return "due_soon";
  return "ok";
}

// ---------- gym ----------
export interface TeamMember {
  name: string;
  email: string;
  role: "Owner" | "Trainer";
}

export interface GymSettings {
  gymName: string;
  ownerName: string;
  assessmentPrice: number; // what the gym charges an athlete per scan
  plan: "core" | "pro" | null;
  planStartedAt: string | null;
  mapping: Record<string, string[]> | null; // corrective map; null = starter library
  team: TeamMember[];
  payoutsConnected: boolean; // card payments switched on for athlete invoices
  passAthleteFee: boolean; // add the per-athlete platform fee to each membership invoice
  accent: string | null; // Pro: brand color in the athlete app
}

export const DEFAULT_SETTINGS: GymSettings = {
  gymName: "Your Gym",
  ownerName: "",
  assessmentPrice: 75,
  plan: null,
  planStartedAt: null,
  mapping: null,
  team: [],
  payoutsConnected: false,
  passAthleteFee: false,
  accent: null,
};
