// Training engine: the exercise library, programs, assignments, the dated schedule they produce,
// and the adherence numbers that come out of athlete check-offs.
import { buildProgram, EXERCISES as CORRECTIVE, type Phase } from "./program";
import { addDays } from "./types";

export type Category = "Strength" | "Power" | "Core" | "Conditioning" | "Mobility" | "Corrective";
export const CATEGORIES: Category[] = ["Strength", "Power", "Core", "Conditioning", "Mobility", "Corrective"];

export interface LibraryExercise {
  id: string; // same as key; lets custom exercises live in the store
  key: string;
  name: string;
  category: Category;
  cue: string;
  videoUrl?: string;
  custom?: boolean;
  phase?: Phase;
}

const e = (key: string, name: string, category: Category, cue: string): LibraryExercise => ({ id: key, key, name, category, cue });

const STARTER: LibraryExercise[] = [
  e("s_back_squat", "Back squat", "Strength", "Brace, break at hips and knees together, drive the floor away."),
  e("s_front_squat", "Front squat", "Strength", "Elbows high, torso tall, knees track over toes."),
  e("s_trap_dl", "Trap bar deadlift", "Strength", "Hips back, chest proud, push the floor away."),
  e("s_rdl", "Romanian deadlift", "Strength", "Soft knees, hinge until the hamstrings load, bar stays close."),
  e("s_rfe_split", "Rear-foot-elevated split squat", "Strength", "Front shin near vertical, drop straight down."),
  e("s_walking_lunge", "Walking lunge", "Strength", "Long stride, back knee kisses the floor, stay tall."),
  e("s_lateral_lunge", "Lateral lunge", "Strength", "Sit into the hip, trail leg straight, chest up."),
  e("s_step_up", "Step-up", "Strength", "Whole foot on the box, drive through the top leg only."),
  e("s_hip_thrust", "Barbell hip thrust", "Strength", "Chin tucked, ribs down, full lockout with the glutes."),
  e("s_nordic", "Nordic hamstring curl", "Strength", "Hips stay extended, lower as slowly as you can."),
  e("s_calf_raise", "Single-leg calf raise", "Strength", "Full stretch at the bottom, pause at the top."),
  e("s_bench", "Bench press", "Strength", "Shoulder blades pinned, bar to mid-chest, feet driving."),
  e("s_db_bench", "Dumbbell bench press", "Strength", "Elbows about 45 degrees, press up and slightly in."),
  e("s_push_up", "Push-up", "Strength", "One straight line, chest to the floor, push the ground away."),
  e("s_ohp", "Overhead press", "Strength", "Glutes tight, bar path straight up, finish with the head through."),
  e("s_landmine", "Half-kneeling landmine press", "Strength", "Ribs down, press up and forward, reach at the top."),
  e("s_pull_up", "Pull-up", "Strength", "Start from a dead hang, drive elbows to the hips."),
  e("s_chin_up", "Chin-up", "Strength", "Palms facing you, chest to the bar, control the lower."),
  e("s_inverted_row", "Inverted row", "Strength", "Body rigid, pull the chest to the bar, pause."),
  e("s_db_row", "One-arm dumbbell row", "Strength", "Flat back, pull to the hip, no torso twist."),
  e("s_face_pull", "Face pull", "Strength", "Pull to the eyebrows, thumbs back, squeeze the rear shoulders."),
  e("p_box_jump", "Box jump", "Power", "Explode up, land soft and quiet, step down."),
  e("p_broad_jump", "Broad jump", "Power", "Big arm swing, jump out, stick the landing."),
  e("p_lateral_bound", "Lateral bound", "Power", "Push off the outside leg, stick each landing for a count."),
  e("p_mb_rot_throw", "Med ball rotational throw", "Power", "Load the back hip, rotate through, throw through the wall."),
  e("p_mb_slam", "Med ball slam", "Power", "Reach tall, snap down with the whole body."),
  e("p_kb_swing", "Kettlebell swing", "Power", "Hike it back, snap the hips, the arms just guide."),
  e("p_hang_clean", "Hang clean", "Power", "Jump and shrug, pull yourself under, fast elbows."),
  e("p_sled_push", "Sled push", "Power", "Body at 45 degrees, long powerful strides."),
  e("c_front_plank", "Front plank", "Core", "Elbows under shoulders, squeeze glutes, pull elbows to toes."),
  e("c_copenhagen", "Copenhagen plank", "Core", "Top leg on the bench, hips high, body in one line."),
  e("c_hanging_knee", "Hanging knee raise", "Core", "No swing, curl the pelvis up, lower slowly."),
  e("c_ab_wheel", "Ab wheel rollout", "Core", "Ribs down, roll out only as far as the back stays flat."),
  e("c_farmer", "Farmer carry", "Core", "Tall posture, shoulders packed, quick small steps."),
  e("c_suitcase", "Suitcase carry", "Core", "One side loaded, do not lean, walk a straight line."),
  e("k_bike", "Assault bike intervals", "Conditioning", "All-out on the work, easy spin on the rest."),
  e("k_shuttle", "5-10-5 shuttle", "Conditioning", "Stay low through the cuts, touch each line."),
  e("k_tempo_run", "Tempo run", "Conditioning", "About 75 percent effort, smooth and relaxed."),
  e("k_row", "Rowing intervals", "Conditioning", "Legs, hips, arms on the drive; reverse it on the way back."),
  e("k_jump_rope", "Jump rope", "Conditioning", "Small bounces, wrists turn the rope, stay on the balls of the feet."),
  e("k_sled_drag", "Backward sled drag", "Conditioning", "Sit back into it, short steps, knees over toes."),
  e("mb_wgs", "World's greatest stretch", "Mobility", "Lunge, elbow to instep, rotate and reach to the sky."),
  e("mb_9090", "90/90 hip switch", "Mobility", "Stay tall, rotate from the hips, heels stay planted."),
  e("mb_cat_cow", "Cat-cow", "Mobility", "Move one segment at a time, breathe with each rep."),
  e("mb_couch", "Couch stretch", "Mobility", "Back knee against the wall, squeeze the glute, stay tall."),
  e("mb_ankle_rocks", "Ankle rocks", "Mobility", "Knee over the little toe, heel stays down."),
];

export const STARTER_LIBRARY: LibraryExercise[] = [
  ...STARTER,
  ...CORRECTIVE.map((c) => ({ id: c.key, key: c.key, name: c.name, category: "Corrective" as Category, cue: c.cue, phase: c.phase })),
];

// A gym's own exercises (and its edits to starter ones, such as an added video) override the starter set.
export function mergeLibrary(custom: LibraryExercise[] = []) {
  const map = new Map(STARTER_LIBRARY.map((x) => [x.key, x]));
  for (const c of custom) map.set(c.key, { ...map.get(c.key), ...c });
  return [...map.values()];
}
export const exerciseIndex = (lib: LibraryExercise[]) => Object.fromEntries(lib.map((x) => [x.key, x])) as Record<string, LibraryExercise>;

// ---------- programs ----------
export interface ProgramItem {
  id: string;
  exercise: string; // library key
  sets: number;
  reps: string; // "8", "30 sec", "5 each"
  load: string; // "RPE 7", "135 lb", ""
  rest: string; // "90 sec", ""
  note: string;
}
export interface ProgramDay {
  id: string;
  name: string;
  weekday: number; // Monday = 0
  items: ProgramItem[];
}
export interface Program {
  id: string;
  name: string;
  summary: string;
  weeks: number;
  days: ProgramDay[];
  created_at: string;
}
export interface Assignment {
  id: string;
  client_id: string;
  program_id: string;
  program: Program; // snapshot, so later edits to the template never rewrite an athlete's history
  start: string; // a Monday, yyyy-mm-dd
  weeks: number;
  status: "active" | "ended";
  created_at: string;
}
export interface WorkoutLog {
  id: string; // assignment:date:day
  client_id: string;
  assignment_id: string;
  day_id: string;
  date: string;
  done: Record<string, number>; // item id -> sets checked off
  completed_at: string | null;
  rpe: number | null;
  note: string;
}

export const newId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

export const item = (exercise: string, sets: number, reps: string, load = "", rest = "", note = ""): ProgramItem => ({ id: newId(), exercise, sets, reps, load, rest, note });

export const prescription = (i: ProgramItem) => `${i.sets} × ${i.reps}${i.load ? ` @ ${i.load}` : ""}`;
export const estMinutes = (d: ProgramDay) => Math.max(10, Math.round((5 + d.items.reduce((t, i) => t + i.sets * 1.7, 0)) / 5) * 5);

// ---------- schedule ----------
export interface Session {
  date: string;
  week: number; // 1-based
  day: ProgramDay;
  assignment: Assignment;
}
export function sessionsFor(a: Assignment): Session[] {
  const out: Session[] = [];
  for (let w = 0; w < a.weeks; w++) for (const day of a.program.days) out.push({ date: addDays(a.start, w * 7 + day.weekday), week: w + 1, day, assignment: a });
  return out.sort((x, y) => x.date.localeCompare(y.date));
}
export const allSessions = (assignments: Assignment[]) => assignments.flatMap(sessionsFor).sort((x, y) => x.date.localeCompare(y.date));
export const logId = (s: Pick<Session, "date" | "day" | "assignment">) => `${s.assignment.id}:${s.date}:${s.day.id}`;
export const indexLogs = (logs: WorkoutLog[]) => new Map(logs.map((l) => [l.id, l]));
export const isDone = (s: Session, logs: Map<string, WorkoutLog>) => Boolean(logs.get(logId(s))?.completed_at);

export const blankLog = (s: Session): WorkoutLog => ({
  id: logId(s),
  client_id: s.assignment.client_id,
  assignment_id: s.assignment.id,
  day_id: s.day.id,
  date: s.date,
  done: {},
  completed_at: null,
  rpe: null,
  note: "",
});

// Sessions that have come due in the window. Today's session only counts once it is finished,
// so nobody is marked as behind at 6am.
export function compliance(sessions: Session[], logs: Map<string, WorkoutLog>, today: string, days = 28) {
  const from = addDays(today, -days);
  const due = sessions.filter((s) => s.date > from && (s.date < today || (s.date === today && isDone(s, logs))));
  const completed = due.filter((s) => isDone(s, logs)).length;
  return { scheduled: due.length, completed, pct: due.length ? (completed / due.length) * 100 : null };
}

// Finished sessions in a row, counting back from the most recent one that has come due.
export function streak(sessions: Session[], logs: Map<string, WorkoutLog>, today: string) {
  let n = 0;
  for (const s of sessions.filter((x) => x.date <= today).reverse()) {
    if (isDone(s, logs)) n++;
    else if (s.date === today) continue;
    else break;
  }
  return n;
}

export function missedInRow(sessions: Session[], logs: Map<string, WorkoutLog>, today: string) {
  let n = 0;
  for (const s of sessions.filter((x) => x.date < today).reverse()) {
    if (isDone(s, logs)) break;
    n++;
  }
  return n;
}

// ---------- building programs ----------
const DOSE: Record<Phase, [number, string]> = { release: [1, "45 sec"], mobilize: [2, "30 sec"], activate: [2, "12-15"], integrate: [2, "8-10"] };

// Turn a scan's findings into a ready-to-edit training program: the corrective session three days a week.
export function programFromScan(fails: string[], mapping: Record<string, string[]> | undefined, athleteName: string): Program {
  const built = buildProgram(fails, mapping);
  const items = () =>
    built.phases.flatMap(({ phase, items }) => items.map(({ exercise, targets }) => item(exercise.key, DOSE[phase.key][0], DOSE[phase.key][1], "", "", `For ${targets.join(", ").toLowerCase()}`)));
  return {
    id: newId(),
    name: `${athleteName}: corrective`,
    summary: "Built from the movement scan. Release, mobilize, activate, then integrate.",
    weeks: 6,
    days: [0, 2, 4].map((weekday, i) => ({ id: newId(), name: `Corrective ${"ABC"[i]}`, weekday, items: items() })),
    created_at: new Date().toISOString(),
  };
}

export const blankProgram = (): Program => ({
  id: newId(),
  name: "Untitled program",
  summary: "",
  weeks: 4,
  days: [{ id: newId(), name: "Day 1", weekday: 0, items: [] }],
  created_at: new Date().toISOString(),
});

const day = (name: string, weekday: number, items: ProgramItem[]): ProgramDay => ({ id: newId(), name, weekday, items });

export const TEMPLATES: { key: string; name: string; summary: string; weeks: number; build: () => ProgramDay[] }[] = [
  {
    key: "foundation",
    name: "Foundation Strength",
    summary: "Three full sessions a week. Big lifts first, single-leg and trunk work behind them.",
    weeks: 8,
    build: () => [
      day("Lower", 0, [
        item("s_back_squat", 4, "6", "RPE 7", "2 min"),
        item("s_rdl", 3, "8", "RPE 7", "90 sec"),
        item("s_rfe_split", 3, "8 each", "", "60 sec"),
        item("s_nordic", 3, "5", "", "90 sec"),
        item("c_front_plank", 3, "40 sec", "", "45 sec"),
      ]),
      day("Upper", 2, [
        item("s_bench", 4, "6", "RPE 7", "2 min"),
        item("s_pull_up", 4, "6", "", "2 min"),
        item("s_landmine", 3, "8 each", "", "60 sec"),
        item("s_db_row", 3, "10 each", "", "60 sec"),
        item("s_face_pull", 3, "15", "", "45 sec"),
        item("a_pallof", 3, "10 each", "", "45 sec"),
      ]),
      day("Full body", 4, [
        item("s_trap_dl", 4, "4", "RPE 8", "2 min"),
        item("p_box_jump", 4, "3", "", "60 sec"),
        item("s_db_bench", 3, "8", "", "90 sec"),
        item("s_inverted_row", 3, "10", "", "60 sec"),
        item("c_farmer", 4, "30 yd", "", "60 sec"),
      ]),
    ],
  },
  {
    key: "inseason",
    name: "In-Season Maintenance",
    summary: "Two short sessions that hold strength without stealing legs from game day.",
    weeks: 6,
    build: () => [
      day("Day 1", 1, [
        item("s_trap_dl", 3, "3", "80%", "2 min"),
        item("s_push_up", 3, "10", "", "60 sec"),
        item("s_chin_up", 3, "5", "", "90 sec"),
        item("s_lateral_lunge", 2, "8 each", "", "60 sec"),
        item("c_copenhagen", 2, "20 sec each", "", "45 sec"),
      ]),
      day("Day 2", 3, [
        item("s_front_squat", 3, "3", "80%", "2 min"),
        item("s_db_bench", 3, "6", "", "90 sec"),
        item("s_db_row", 3, "8 each", "", "60 sec"),
        item("p_mb_rot_throw", 3, "5 each", "", "45 sec"),
        item("a_deadbug", 2, "10", "", "30 sec"),
      ]),
    ],
  },
  {
    key: "speed",
    name: "Speed and Power",
    summary: "Jumps, throws and sprints for athletes who need to be faster in the first three steps.",
    weeks: 6,
    build: () => [
      day("Acceleration", 0, [
        item("p_broad_jump", 4, "3", "", "60 sec"),
        item("p_sled_push", 6, "15 yd", "heavy", "90 sec"),
        item("p_hang_clean", 5, "2", "RPE 7", "2 min"),
        item("s_step_up", 3, "6 each", "", "60 sec"),
        item("c_hanging_knee", 3, "10", "", "45 sec"),
      ]),
      day("Lateral", 2, [
        item("p_lateral_bound", 4, "4 each", "", "60 sec"),
        item("p_mb_slam", 4, "5", "", "45 sec"),
        item("p_kb_swing", 4, "8", "", "60 sec"),
        item("s_lateral_lunge", 3, "6 each", "", "60 sec"),
        item("c_suitcase", 3, "30 yd each", "", "45 sec"),
      ]),
      day("Conditioning", 5, [
        item("k_shuttle", 6, "1", "", "60 sec"),
        item("k_bike", 8, "20 sec on, 40 off", "", ""),
        item("k_jump_rope", 3, "60 sec", "", "30 sec"),
        item("a_sideplank", 2, "30 sec each", "", "30 sec"),
      ]),
    ],
  },
];

export const fromTemplate = (key: string): Program => {
  const t = TEMPLATES.find((x) => x.key === key)!;
  return { id: newId(), name: t.name, summary: t.summary, weeks: t.weeks, days: t.build(), created_at: new Date().toISOString() };
};
