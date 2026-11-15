// Corrective program engine. A starter exercise library and a default map from each compensation
// to the exercises that address it. Gyms replace both with their own system in the Library screen.
import { DEFAULT_BATTERY } from "./battery";

export type Phase = "release" | "mobilize" | "activate" | "integrate";

export const PHASES: { key: Phase; label: string; dose: string; blurb: string }[] = [
  { key: "release", label: "Release", dose: "30–60 sec per area", blurb: "Calm down overactive tissue" },
  { key: "mobilize", label: "Mobilize", dose: "2 × 30 sec", blurb: "Restore range of motion" },
  { key: "activate", label: "Activate", dose: "2 × 12–15", blurb: "Wake up underactive muscles" },
  { key: "integrate", label: "Integrate", dose: "2 × 8–10", blurb: "Put it back into the movement" },
];

export interface Exercise {
  key: string;
  name: string;
  phase: Phase;
  cue: string;
  videoUrl?: string;
}

const ex = (key: string, name: string, phase: Phase, cue: string): Exercise => ({ key, name, phase, cue });

export const EXERCISES: Exercise[] = [
  ex("r_calf", "Calf release", "release", "Roller under the calf, slow passes, pause on tender spots."),
  ex("r_tfl", "TFL and IT band release", "release", "Side-lying on the roller, front-outside of the hip."),
  ex("r_adductor", "Adductor release", "release", "Face down, knee out to the side, roller along the inner thigh."),
  ex("r_hipflexor", "Hip flexor release", "release", "Ball just inside the front of the hip bone, breathe and hold."),
  ex("r_hamstring", "Hamstring release", "release", "Roller under the back of the thigh, rotate in and out."),
  ex("r_lats", "Lat release", "release", "Side-lying, arm overhead, roller under the armpit."),
  ex("r_pecs", "Pec release", "release", "Ball against a wall just below the collarbone."),
  ex("r_tspine", "Thoracic spine release", "release", "Roller across the upper back, hands behind head."),
  ex("r_upper_trap", "Upper trap release", "release", "Ball between the shoulder blade and wall, slow pressure."),
  ex("m_calf", "Wall calf stretch", "mobilize", "Back heel down, toes forward, lean into the wall."),
  ex("m_ankle", "Knee-to-wall ankle mobility", "mobilize", "Drive the knee over the toes to touch the wall, heel stays down."),
  ex("m_hipflexor", "Half-kneeling hip flexor stretch", "mobilize", "Squeeze the back glute and tuck the pelvis."),
  ex("m_adductor", "Adductor rock-back", "mobilize", "Quadruped, one leg out to the side, sit the hips back."),
  ex("m_hamstring", "Supine hamstring stretch", "mobilize", "Strap around the foot, keep the knee straight."),
  ex("m_lat", "Bench lat stretch", "mobilize", "Elbows on a bench, sink the chest toward the floor."),
  ex("m_pec", "Doorway pec stretch", "mobilize", "Forearm on the frame at shoulder height, step through."),
  ex("m_tspine", "Open book rotation", "mobilize", "Side-lying, knees stacked, rotate the top arm open."),
  ex("m_sleeper", "Sleeper stretch", "mobilize", "Side-lying on the working shoulder, press the forearm down gently."),
  ex("m_neck", "Chin tuck with side stretch", "mobilize", "Tuck the chin, tilt ear to shoulder, light hand assist."),
  ex("a_shortfoot", "Short foot", "activate", "Pull the ball of the foot toward the heel without curling toes."),
  ex("a_tib", "Tibialis raises", "activate", "Back against a wall, lift the toes, slow lower."),
  ex("a_glutemed", "Side-lying hip abduction", "activate", "Heel leads, toes slightly down, don't roll back."),
  ex("a_bandwalk", "Mini-band lateral walk", "activate", "Athletic stance, knees pressed out against the band."),
  ex("a_glutebridge", "Glute bridge", "activate", "Drive through the heels, ribs down, squeeze at the top."),
  ex("a_deadbug", "Dead bug", "activate", "Low back flat, opposite arm and leg reach slowly."),
  ex("a_birddog", "Bird dog", "activate", "Long spine, reach without the hips rotating."),
  ex("a_sideplank", "Side plank", "activate", "Straight line from head to feet, hips high."),
  ex("a_pallof", "Pallof press", "activate", "Press the band straight out and resist the pull."),
  ex("a_lowtrap", "Prone Y raise", "activate", "Thumbs up, lift from the shoulder blades, no shrug."),
  ex("a_serratus", "Wall slide with lift-off", "activate", "Forearms on the wall, slide up and float off at the top."),
  ex("a_ext_rot", "Band external rotation", "activate", "Elbow pinned at the side, rotate out slowly."),
  ex("a_chin", "Chin tuck hold", "activate", "Make a double chin, hold 5 seconds, keep the eyes level."),
  ex("i_goblet", "Goblet squat to box", "integrate", "Weight in front, knees track over toes, tap and stand."),
  ex("i_splitsquat", "Split squat", "integrate", "Even weight front and back, torso tall."),
  ex("i_stepdown", "Lateral step-down", "integrate", "Knee tracks over the second toe, slow tap down."),
  ex("i_rdl", "Single-leg RDL", "integrate", "Hinge from the hip, hips square to the floor."),
  ex("i_ohsquat", "Dowel overhead squat", "integrate", "Dowel stays over the mid-foot the whole rep."),
  ex("i_squatrow", "Squat to row", "integrate", "Squat down, stand and row in one smooth pattern."),
  ex("i_pushup_plus", "Push-up plus", "integrate", "At the top, push the floor away to spread the shoulder blades."),
  ex("i_chop", "Half-kneeling cable chop", "integrate", "Rotate through the upper back, hips stay facing forward."),
];

export const EX_BY_KEY = Object.fromEntries(EXERCISES.map((e) => [e.key, e]));

// Compensation key -> exercise keys. Keyed by compensation so "valgus" means the same fix in every test.
export const DEFAULT_MAPPING: Record<string, string[]> = {
  foot_turns_out: ["r_calf", "m_calf", "a_glutemed", "i_goblet"],
  foot_flattens: ["r_calf", "a_shortfoot", "a_bandwalk", "i_stepdown"],
  heels_lift: ["r_calf", "m_ankle", "a_tib", "i_goblet"],
  valgus: ["r_adductor", "m_adductor", "a_bandwalk", "i_stepdown"],
  varus: ["r_tfl", "a_glutebridge", "i_splitsquat"],
  asym_shift: ["r_adductor", "r_tfl", "a_sideplank", "i_splitsquat"],
  forward_lean: ["r_hipflexor", "m_hipflexor", "m_ankle", "a_glutebridge", "i_goblet"],
  low_back_arch: ["r_hipflexor", "m_hipflexor", "a_deadbug", "i_goblet"],
  low_back_round: ["r_hamstring", "m_hamstring", "a_birddog", "i_rdl"],
  arms_fall_forward: ["r_lats", "m_lat", "a_lowtrap", "i_ohsquat"],
  uncontrolled_trunk: ["a_pallof", "a_sideplank", "i_rdl"],
  loss_of_balance: ["a_shortfoot", "a_glutemed", "i_rdl"],
  flexion: ["r_lats", "m_lat", "a_serratus", "i_ohsquat"],
  external_rotation: ["r_pecs", "a_ext_rot", "i_squatrow"],
  internal_rotation: ["m_sleeper", "a_ext_rot"],
  h_abduction: ["r_pecs", "m_pec", "a_lowtrap"],
  head_forward: ["r_upper_trap", "m_neck", "a_chin"],
  scapular_winging: ["a_serratus", "i_pushup_plus"],
  knees_bend: ["m_hamstring", "a_deadbug"],
  trunk_lateral_flexion: ["r_lats", "a_sideplank"],
  trunk_rotation: ["r_tspine", "m_tspine", "i_chop"],
  cervical_lateral_flexion: ["r_upper_trap", "m_neck"],
  cervical_rotation: ["m_neck", "a_chin"],
};

export const COMPENSATION_LABELS: Record<string, string> = Object.fromEntries(
  DEFAULT_BATTERY.flatMap((m) => m.compensations.map((c) => [c.key, c.label])),
);

const LIMIT: Record<Phase, number> = { release: 3, mobilize: 3, activate: 3, integrate: 2 };

export interface ProgramItem {
  exercise: Exercise;
  targets: string[]; // compensation labels this exercise addresses
}
export interface Program {
  phases: { phase: (typeof PHASES)[number]; items: ProgramItem[] }[];
  count: number;
}

// Build a program from a scan's failed slots. Exercises that address more of the athlete's
// compensations rank first, and each phase is capped so the session stays around 20 minutes.
export function buildProgram(fails: string[], mapping: Record<string, string[]> = DEFAULT_MAPPING): Program {
  const comps = Array.from(new Set(fails.map((f) => f.split(".")[1])));
  const hits = new Map<string, Set<string>>();
  for (const comp of comps) {
    for (const key of mapping[comp] ?? []) {
      if (!EX_BY_KEY[key]) continue;
      if (!hits.has(key)) hits.set(key, new Set());
      hits.get(key)!.add(COMPENSATION_LABELS[comp] ?? comp);
    }
  }
  const phases = PHASES.map((phase) => {
    const items = [...hits.entries()]
      .filter(([k]) => EX_BY_KEY[k].phase === phase.key)
      .sort((a, b) => b[1].size - a[1].size || EX_BY_KEY[a[0]].name.localeCompare(EX_BY_KEY[b[0]].name))
      .slice(0, LIMIT[phase.key])
      .map(([k, t]) => ({ exercise: EX_BY_KEY[k], targets: [...t] }));
    return { phase, items };
  }).filter((p) => p.items.length > 0);
  return { phases, count: phases.reduce((n, p) => n + p.items.length, 0) };
}
