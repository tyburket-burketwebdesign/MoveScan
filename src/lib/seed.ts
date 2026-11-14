// Two real scans transcribed from Ambrose's spreadsheet. Used as acceptance tests for the scoring
// engine and as demo data so the app has something to show before any real clients are added.
const both = (m: string, comps: string[]) => comps.flatMap((c) => [`${m}.${c}.R`, `${m}.${c}.L`]);

export const RALEIGH_FAILS = [
  ...both("squat", ["foot_turns_out", "foot_flattens", "valgus"]),
  ...both("one_leg_squat", ["foot_flattens", "uncontrolled_trunk", "valgus"]),
  ...both("shoulder", ["flexion", "external_rotation", "internal_rotation", "h_abduction"]),
  "push_up.head_forward.W",
  "push_up.low_back_arch.W",
  ...both("spinal", ["trunk_lateral_flexion", "trunk_rotation"]),
];

export const CARSON_FAILS = [
  ...both("squat", ["foot_turns_out", "foot_flattens"]),
  "squat.heels_lift.L",
  ...both("he_squat", ["foot_turns_out", "foot_flattens"]),
  "he_squat.asym_shift.R",
  ...both("one_leg_squat", ["foot_flattens", "uncontrolled_trunk", "valgus"]),
  "one_leg_squat.loss_of_balance.L",
  ...both("shoulder", ["flexion", "external_rotation", "internal_rotation"]),
  "shoulder.h_abduction.R",
  "push_up.head_forward.W",
  "push_up.low_back_arch.W",
  ...both("spinal", ["trunk_rotation"]),
];
