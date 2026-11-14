// The default assessment battery, transcribed from Ambrose's spreadsheet.
// "side" compensations are checked on the right and left independently.
// "whole" compensations are checked once for the whole body (the spreadsheet's "Synergy" column).
// Every compensation is tagged to a body region so the results screen can draw the heatmap.

export type CompType = "side" | "whole";

export type Region =
  | "neck"
  | "shoulder"
  | "upper_back"
  | "trunk"
  | "low_back"
  | "hip"
  | "knee"
  | "foot";

export interface Compensation {
  key: string;
  label: string;
  type: CompType;
  region: Region;
}

export interface Movement {
  key: string;
  label: string;
  cue: string;
  compensations: Compensation[];
}

export const REGION_LABELS: Record<Region, string> = {
  neck: "Neck",
  shoulder: "Shoulders",
  upper_back: "Upper back",
  trunk: "Trunk / core",
  low_back: "Low back",
  hip: "Hips",
  knee: "Knees",
  foot: "Feet & ankles",
};

const c = (key: string, label: string, type: CompType, region: Region): Compensation => ({
  key,
  label,
  type,
  region,
});

export const DEFAULT_BATTERY: Movement[] = [
  {
    key: "squat",
    label: "Squat",
    cue: "Arms overhead, feet shoulder width, squat to chair height. 5 reps, front then side view.",
    compensations: [
      c("foot_turns_out", "Foot turns out", "side", "foot"),
      c("foot_flattens", "Foot flattens", "side", "foot"),
      c("heels_lift", "Heels lift", "side", "foot"),
      c("valgus", "Valgus", "side", "knee"),
      c("varus", "Varus", "side", "knee"),
      c("asym_shift", "Asym shift", "side", "hip"),
      c("forward_lean", "Forward lean", "whole", "trunk"),
      c("low_back_arch", "Low back arch", "whole", "low_back"),
      c("low_back_round", "Low back round", "whole", "low_back"),
      c("arms_fall_forward", "Arms fall forward", "whole", "shoulder"),
    ],
  },
  {
    key: "he_squat",
    label: "HE Squat",
    cue: "Heels elevated squat. Same setup as the squat, heels on a raised surface.",
    compensations: [
      c("foot_turns_out", "Foot turns out", "side", "foot"),
      c("foot_flattens", "Foot flattens", "side", "foot"),
      c("valgus", "Valgus", "side", "knee"),
      c("varus", "Varus", "side", "knee"),
      c("asym_shift", "Asym shift", "side", "hip"),
      c("forward_lean", "Forward lean", "whole", "trunk"),
      c("low_back_arch", "Low back arch", "whole", "low_back"),
      c("low_back_round", "Low back round", "whole", "low_back"),
      c("arms_fall_forward", "Arms fall forward", "whole", "shoulder"),
    ],
  },
  {
    key: "one_leg_squat",
    label: "1 Leg Squat",
    cue: "Single leg squat, each side. Hands on hips.",
    compensations: [
      c("foot_flattens", "Foot flattens", "side", "foot"),
      c("uncontrolled_trunk", "Uncontrolled trunk", "side", "trunk"),
      c("valgus", "Valgus", "side", "knee"),
      c("varus", "Varus", "side", "knee"),
      c("loss_of_balance", "Loss of balance", "side", "hip"),
    ],
  },
  {
    key: "shoulder",
    label: "Shoulder Movement",
    cue: "Flexion, external rotation, internal rotation and horizontal abduction, each side.",
    compensations: [
      c("flexion", "Flexion", "side", "shoulder"),
      c("external_rotation", "External rotation", "side", "shoulder"),
      c("internal_rotation", "Internal rotation", "side", "shoulder"),
      c("h_abduction", "H. abduction", "side", "shoulder"),
    ],
  },
  {
    key: "push_up",
    label: "Push Up",
    cue: "Standard push up, 5 reps, side view.",
    compensations: [
      c("head_forward", "Head forward", "whole", "neck"),
      c("low_back_arch", "Low back arch", "whole", "low_back"),
      c("scapular_winging", "Scapular winging", "whole", "upper_back"),
      c("knees_bend", "Knees bend", "whole", "knee"),
    ],
  },
  {
    key: "spinal",
    label: "Spinal Movements",
    cue: "Trunk and cervical lateral flexion and rotation, each side.",
    compensations: [
      c("trunk_lateral_flexion", "Trunk lateral flexion", "side", "trunk"),
      c("trunk_rotation", "Trunk rotation", "side", "trunk"),
      c("cervical_lateral_flexion", "Cervical lateral flexion", "side", "neck"),
      c("cervical_rotation", "Cervical rotation", "side", "neck"),
    ],
  },
];
