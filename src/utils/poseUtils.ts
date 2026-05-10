// ============================================================
// poseUtils.ts — PhysioBuddy Pose Analysis Engine
// ============================================================

// ----- Types -----

export type ExerciseType =
  | 'elbow_flexion'
  | 'shoulder_abduction'
  | 'shoulder_abduction_stretch'
  | 'shoulder_flexion'
  | 'shoulder_internal_external_rotation'
  | 'arm_raise_rehab'
  | 'knee_rotation'
  | 'straight_leg_raise'
  | 'sit_to_stand'
  | 'squat'
  | 'single_leg_stand'
  | 'heel_raises'
  | 'toe_raises'
  | 'back_straightening'
  | 'neck_alignment'
  | 'basic_core_activation';

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface FeedbackInfo {
  message: string;
  type: 'correct' | 'warning' | 'error';
}

export interface ExerciseState {
  stage: 'up' | 'down' | 'idle';
  reps: number;
  angle: number;
  feedback: FeedbackInfo;
  formCorrect: boolean;
}

// ----- MediaPipe landmark indices -----

export const LM = {
  NOSE: 0,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

// ----- Helpers -----

/** Calculate the angle (degrees) at vertex b, formed by points a-b-c. */
export function calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * (180.0 / Math.PI));
  if (angle > 180) angle = 360 - angle;
  return angle;
}

/** Check whether all given landmark indices have visibility above threshold. */
export function areVisible(
  landmarks: Landmark[],
  indices: number[],
  threshold = 0.65,
): boolean {
  return indices.every((i) => {
    const lm = landmarks[i];
    return lm && (lm.visibility === undefined || lm.visibility > threshold);
  });
}

/** Pick the side (left/right) with better average visibility for a pair of index sets. */
export function pickSide(
  landmarks: Landmark[],
  leftIndices: number[],
  rightIndices: number[],
): 'left' | 'right' | null {
  const vis = (indices: number[]) =>
    indices.reduce((s, i) => s + (landmarks[i]?.visibility ?? 0), 0) /
    indices.length;

  const leftOk = areVisible(landmarks, leftIndices, 0.6);
  const rightOk = areVisible(landmarks, rightIndices, 0.6);

  if (leftOk && rightOk) return vis(leftIndices) >= vis(rightIndices) ? 'left' : 'right';
  if (leftOk) return 'left';
  if (rightOk) return 'right';
  return null;
}

// ----- Angle Smoothing -----

const angleHistories: Map<string, number[]> = new Map();
const SMOOTH_WINDOW = 7;

/**
 * Smooth an angle using a moving average of the last N frames.
 * @param key Unique key per exercise+side combo to keep separate histories.
 * @param rawAngle The raw angle from this frame.
 */
export function smoothAngle(key: string, rawAngle: number): number {
  let history = angleHistories.get(key);
  if (!history) {
    history = [];
    angleHistories.set(key, history);
  }
  history.push(rawAngle);
  if (history.length > SMOOTH_WINDOW) history.shift();
  return history.reduce((s, v) => s + v, 0) / history.length;
}

/** Clear angle smoothing history (call when resetting a session). */
export function resetSmoothing(): void {
  angleHistories.clear();
}

// Default idle state
export function idleState(): ExerciseState {
  return {
    stage: 'idle',
    reps: 0,
    angle: 0,
    feedback: { message: 'Get ready to start', type: 'correct' },
    formCorrect: true,
  };
}

// ----- Exercise-specific visibility check -----

const UPPER_BODY_EXERCISES: ExerciseType[] = [
  'elbow_flexion',
  'shoulder_abduction',
  'shoulder_abduction_stretch',
  'shoulder_flexion',
  'shoulder_internal_external_rotation',
  'arm_raise_rehab',
];

const LOWER_BODY_EXERCISES: ExerciseType[] = [
  'squat',
  'sit_to_stand',
  'straight_leg_raise',
  'heel_raises',
  'toe_raises',
  'single_leg_stand',
  'knee_rotation',
];

/**
 * Check if the landmarks required for a specific exercise are visible.
 * Upper body exercises only need shoulder+elbow+wrist.
 * Lower body exercises only need hip+knee+ankle.
 * Core/posture exercises only need shoulder+hip.
 */
export function isExerciseVisible(
  landmarks: Landmark[],
  exerciseType: ExerciseType,
): boolean {
  const visible = (i: number): boolean => {
    const lm = landmarks[i];
    return !!lm && (lm.visibility === undefined || lm.visibility > 0.3);
  };

  if (UPPER_BODY_EXERCISES.includes(exerciseType)) {
    // Need at least one side's shoulder+elbow+wrist
    const leftOk = visible(LM.LEFT_SHOULDER) && visible(LM.LEFT_ELBOW) && visible(LM.LEFT_WRIST);
    const rightOk = visible(LM.RIGHT_SHOULDER) && visible(LM.RIGHT_ELBOW) && visible(LM.RIGHT_WRIST);
    return leftOk || rightOk;
  }

  if (LOWER_BODY_EXERCISES.includes(exerciseType)) {
    // Need at least one side's hip+knee+ankle
    const leftOk = visible(LM.LEFT_HIP) && visible(LM.LEFT_KNEE) && visible(LM.LEFT_ANKLE);
    const rightOk = visible(LM.RIGHT_HIP) && visible(LM.RIGHT_KNEE) && visible(LM.RIGHT_ANKLE);
    return leftOk || rightOk;
  }

  // Core/posture: need at least one shoulder + one hip
  return (visible(LM.LEFT_SHOULDER) || visible(LM.RIGHT_SHOULDER)) &&
         (visible(LM.LEFT_HIP) || visible(LM.RIGHT_HIP));
}

// ----- Exercise detector type -----

export type ExerciseDetector = (
  landmarks: Landmark[],
  prev: ExerciseState,
) => ExerciseState | null;


// ============================================================
// Exercise Detectors — with smoothing + stricter thresholds
// ============================================================

// ---------- 1. Elbow Flexion / Extension ----------

export const detectElbowFlexion: ExerciseDetector = (landmarks, prev) => {
  let side = pickSide(
    landmarks,
    [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST],
    [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
  );
  if (!side) side = 'right'; // Fallback for robustness

  const S = side === 'left' ? LM.LEFT_SHOULDER : LM.RIGHT_SHOULDER;
  const E = side === 'left' ? LM.LEFT_ELBOW : LM.RIGHT_ELBOW;
  const W = side === 'left' ? LM.LEFT_WRIST : LM.RIGHT_WRIST;

  const rawAngle = calculateAngle(landmarks[S], landmarks[E], landmarks[W]);
  const angle = smoothAngle('elbow_flexion_' + side, rawAngle);

  let stage = prev.stage;
  let reps = prev.reps;

  // Thresholds: LOW = 80 (flexed), HIGH = 140 (extended)
  if (angle < 80) {
    stage = 'down';
  } else if (angle > 140) {
    if (stage === 'down') reps++;
    stage = 'up';
  }

  const formCorrect =
    (stage === 'up' && angle > 135) ||
    (stage === 'down' && angle < 85) ||
    stage === 'idle';

  let feedback: FeedbackInfo;
  if (stage === 'idle') {
    feedback = { message: 'Start moving to begin', type: 'correct' };
  } else if (formCorrect) {
    feedback = { message: 'Perfect form! Keep it up!', type: 'correct' };
  } else if (angle > 85 && angle < 135) {
    feedback = { message: 'Complete the movement fully', type: 'warning' };
  } else if (angle > 100 && stage === 'down') {
    feedback = { message: 'Bend your elbow more', type: 'warning' };
  } else {
    feedback = { message: 'Straighten your arm fully', type: 'warning' };
  }

  return { stage, reps, angle, feedback, formCorrect };
};

// ---------- 2. Shoulder Abduction ----------

export const detectShoulderAbduction: ExerciseDetector = (landmarks, prev) => {
  let side = pickSide(
    landmarks,
    [LM.LEFT_HIP, LM.LEFT_SHOULDER, LM.LEFT_WRIST],
    [LM.RIGHT_HIP, LM.RIGHT_SHOULDER, LM.RIGHT_WRIST],
  );
  if (!side) side = 'right';

  const H = side === 'left' ? LM.LEFT_HIP : LM.RIGHT_HIP;
  const S = side === 'left' ? LM.LEFT_SHOULDER : LM.RIGHT_SHOULDER;
  const W = side === 'left' ? LM.LEFT_WRIST : LM.RIGHT_WRIST;

  const rawAngle = calculateAngle(landmarks[H], landmarks[S], landmarks[W]);
  const angle = smoothAngle('shoulder_abd_' + side, rawAngle);

  let stage = prev.stage;
  let reps = prev.reps;

  if (angle < 25) {
    stage = 'down';
  } else if (angle > 85) {
    if (stage === 'down') reps++;
    stage = 'up';
  }

  const formCorrect =
    (stage === 'up' && angle > 80) ||
    (stage === 'down' && angle < 30) ||
    stage === 'idle';

  let feedback: FeedbackInfo;
  if (formCorrect) {
    feedback = { message: 'Perfect form! Keep it up!', type: 'correct' };
  } else if (angle < 40 && stage === 'up') {
    feedback = { message: 'Arm barely raised — lift higher to the side', type: 'error' };
  } else if (angle > 25 && angle < 85 && stage !== 'idle') {
    feedback = { message: 'Incomplete range — raise arm higher', type: 'warning' };
  } else if (angle < 60 && stage === 'up') {
    feedback = { message: 'Raise your arm higher to the side', type: 'warning' };
  } else {
    feedback = { message: 'Lower your arm back down slowly', type: 'warning' };
  }

  return { stage, reps, angle, feedback, formCorrect };
};

// ---------- 3. Shoulder Flexion ----------

export const detectShoulderFlexion: ExerciseDetector = (landmarks, prev) => {
  let side = pickSide(
    landmarks,
    [LM.LEFT_HIP, LM.LEFT_SHOULDER, LM.LEFT_ELBOW],
    [LM.RIGHT_HIP, LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW],
  );
  if (!side) side = 'right';

  const H = side === 'left' ? LM.LEFT_HIP : LM.RIGHT_HIP;
  const S = side === 'left' ? LM.LEFT_SHOULDER : LM.RIGHT_SHOULDER;
  const E = side === 'left' ? LM.LEFT_ELBOW : LM.RIGHT_ELBOW;

  const rawAngle = calculateAngle(landmarks[H], landmarks[S], landmarks[E]);
  const angle = smoothAngle('shoulder_flex_' + side, rawAngle);

  let stage = prev.stage;
  let reps = prev.reps;

  if (angle < 20) {
    stage = 'down';
  } else if (angle > 85) {
    if (stage === 'down') reps++;
    stage = 'up';
  }

  const formCorrect =
    (stage === 'up' && angle > 80) ||
    (stage === 'down' && angle < 25) ||
    stage === 'idle';

  let feedback: FeedbackInfo;
  if (formCorrect) {
    feedback = { message: 'Perfect form! Keep it up!', type: 'correct' };
  } else if (angle < 30 && stage === 'up') {
    feedback = { message: 'Arm barely raised — extend forward more', type: 'error' };
  } else if (angle > 20 && angle < 85 && stage !== 'idle') {
    feedback = { message: 'Incomplete range — raise arm higher in front', type: 'warning' };
  } else {
    feedback = { message: 'Control the movement', type: 'warning' };
  }

  return { stage, reps, angle, feedback, formCorrect };
};

// ---------- 4. Shoulder Internal & External Rotation ----------

export const detectShoulderInternalExternalRotation: ExerciseDetector = (landmarks, prev) => {
  let side = pickSide(
    landmarks,
    [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST],
    [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
  );
  if (!side) side = 'right';

  const S = side === 'left' ? LM.LEFT_SHOULDER : LM.RIGHT_SHOULDER;
  const E = side === 'left' ? LM.LEFT_ELBOW : LM.RIGHT_ELBOW;
  const W = side === 'left' ? LM.LEFT_WRIST : LM.RIGHT_WRIST;

  const rawAngle = calculateAngle(landmarks[S], landmarks[E], landmarks[W]);
  const angle = smoothAngle('shoulder_int_ext_rot_' + side, rawAngle);

  let stage = prev.stage;
  let reps = prev.reps;

  if (angle < 65) {
    stage = 'down';
  } else if (angle > 125) {
    if (stage === 'down') reps++;
    stage = 'up';
  }

  const formCorrect =
    (stage === 'up' && angle > 120) ||
    (stage === 'down' && angle < 70) ||
    stage === 'idle';

  let feedback: FeedbackInfo;
  if (formCorrect) {
    feedback = { message: 'Perfect form! Keep it up!', type: 'correct' };
  } else if (stage === 'up') {
    feedback = { message: 'Rotate your forearm outward more', type: 'warning' };
  } else {
    feedback = { message: 'Keep elbow close to your side', type: 'warning' };
  }

  return { stage, reps, angle, feedback, formCorrect };
};

// ---------- 4b. Shoulder Abduction Stretch ----------

export const detectShoulderAbductionStretch: ExerciseDetector = (landmarks, prev) => {
  let side = pickSide(
    landmarks,
    [LM.LEFT_HIP, LM.LEFT_SHOULDER, LM.LEFT_WRIST],
    [LM.RIGHT_HIP, LM.RIGHT_SHOULDER, LM.RIGHT_WRIST],
  );
  if (!side) side = 'right';

  const H = side === 'left' ? LM.LEFT_HIP : LM.RIGHT_HIP;
  const S = side === 'left' ? LM.LEFT_SHOULDER : LM.RIGHT_SHOULDER;
  const W = side === 'left' ? LM.LEFT_WRIST : LM.RIGHT_WRIST;

  const rawAngle = calculateAngle(landmarks[H], landmarks[S], landmarks[W]);
  const angle = smoothAngle('shoulder_abd_stretch_' + side, rawAngle);

  let stage = prev.stage;
  let reps = prev.reps;

  if (angle < 25) {
    stage = 'down';
  } else if (angle > 100) {
    if (stage === 'down') reps++;
    stage = 'up';
  }

  const formCorrect =
    (stage === 'up' && angle > 95) ||
    (stage === 'down' && angle < 30) ||
    stage === 'idle';

  let feedback: FeedbackInfo;
  if (formCorrect) {
    feedback = { message: 'Great stretch! Hold it!', type: 'correct' };
  } else if (stage === 'up') {
    feedback = { message: 'Stretch your arm higher to the side', type: 'warning' };
  } else {
    feedback = { message: 'Lower your arm slowly', type: 'warning' };
  }

  return { stage, reps, angle, feedback, formCorrect };
};

// ---------- 5. Knee Rotation ----------

export const detectKneeRotation: ExerciseDetector = (landmarks, prev) => {
  let side = pickSide(
    landmarks,
    [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE],
    [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
  );
  if (!side) side = 'right';

  const H = side === 'left' ? LM.LEFT_HIP : LM.RIGHT_HIP;
  const K = side === 'left' ? LM.LEFT_KNEE : LM.RIGHT_KNEE;
  const A = side === 'left' ? LM.LEFT_ANKLE : LM.RIGHT_ANKLE;

  const rawAngle = calculateAngle(landmarks[H], landmarks[K], landmarks[A]);
  const angle = smoothAngle('knee_rot_' + side, rawAngle);

  let stage = prev.stage;
  let reps = prev.reps;

  if (angle < 95) {
    stage = 'down';
  } else if (angle > 165) {
    if (stage === 'down') reps++;
    stage = 'up';
  }

  const formCorrect =
    (stage === 'up' && angle > 160) ||
    (stage === 'down' && angle < 100) ||
    stage === 'idle';

  let feedback: FeedbackInfo;
  if (formCorrect) {
    feedback = { message: 'Perfect form! Keep it up!', type: 'correct' };
  } else if (angle < 120 && stage === 'up') {
    feedback = { message: 'Leg not extended — straighten fully', type: 'error' };
  } else if (angle > 95 && angle < 165 && stage !== 'idle') {
    feedback = { message: 'Incomplete range — extend your leg fully', type: 'warning' };
  } else if (angle < 140 && stage === 'up') {
    feedback = { message: 'Extend your leg fully', type: 'warning' };
  } else {
    feedback = { message: 'Bend your knee to 90 degrees', type: 'warning' };
  }

  return { stage, reps, angle, feedback, formCorrect };
};

// ---------- 6. Straight Leg Raise ----------

export const detectStraightLegRaise: ExerciseDetector = (landmarks, prev) => {
  let side = pickSide(
    landmarks,
    [LM.LEFT_SHOULDER, LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE],
    [LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
  );
  if (!side) side = 'right';

  const S = side === 'left' ? LM.LEFT_SHOULDER : LM.RIGHT_SHOULDER;
  const H = side === 'left' ? LM.LEFT_HIP : LM.RIGHT_HIP;
  const K = side === 'left' ? LM.LEFT_KNEE : LM.RIGHT_KNEE;
  const A = side === 'left' ? LM.LEFT_ANKLE : LM.RIGHT_ANKLE;

  // Check knee is straight (leg straight requirement)
  const kneeAngle = calculateAngle(landmarks[H], landmarks[K], landmarks[A]);
  const hipAngle = calculateAngle(landmarks[S], landmarks[H], landmarks[A]);
  const angle = smoothAngle('slr_' + side, hipAngle);

  let stage = prev.stage;
  let reps = prev.reps;

  // Straight leg raise: hip angle > 30 when raised, knee must stay > 150
  if (angle > 165) {
    stage = 'down';
  } else if (angle < 115) {
    if (stage === 'down') reps++;
    stage = 'up';
  }

  const kneeStraight = kneeAngle > 150;
  const formCorrect =
    kneeStraight && (
      (stage === 'up' && angle < 120) ||
      (stage === 'down' && angle > 160) ||
      stage === 'idle'
    );

  let feedback: FeedbackInfo;
  if (!kneeStraight) {
    feedback = { message: 'Keep your leg straight', type: 'error' };
  } else if (formCorrect) {
    feedback = { message: 'Perfect form! Keep it up!', type: 'correct' };
  } else if (angle > 150 && stage === 'up') {
    feedback = { message: 'Leg barely raised — lift higher', type: 'error' };
  } else if (stage === 'up') {
    feedback = { message: 'Raise your leg higher, keep it straight', type: 'warning' };
  } else {
    feedback = { message: 'Lower your leg slowly', type: 'warning' };
  }

  return { stage, reps, angle, feedback, formCorrect };
};

// ---------- 7. Sit to Stand ----------

export const detectSitToStand: ExerciseDetector = (landmarks, prev) => {
  let side = pickSide(
    landmarks,
    [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE],
    [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
  );
  if (!side) side = 'right';

  const H = side === 'left' ? LM.LEFT_HIP : LM.RIGHT_HIP;
  const K = side === 'left' ? LM.LEFT_KNEE : LM.RIGHT_KNEE;
  const A = side === 'left' ? LM.LEFT_ANKLE : LM.RIGHT_ANKLE;

  const rawAngle = calculateAngle(landmarks[H], landmarks[K], landmarks[A]);
  const angle = smoothAngle('sit_to_stand_' + side, rawAngle);

  let stage = prev.stage;
  let reps = prev.reps;

  if (angle < 95) {
    stage = 'down';
  } else if (angle > 165) {
    if (stage === 'down') reps++;
    stage = 'up';
  }

  const formCorrect =
    (stage === 'up' && angle > 160) ||
    (stage === 'down' && angle < 100) ||
    stage === 'idle';

  let feedback: FeedbackInfo;
  if (formCorrect) {
    feedback = { message: 'Perfect form! Keep it up!', type: 'correct' };
  } else if (angle < 130 && stage === 'up') {
    feedback = { message: 'Not standing fully — straighten your legs', type: 'error' };
  } else if (stage === 'up') {
    feedback = { message: 'Stand up fully, straighten your knees', type: 'warning' };
  } else {
    feedback = { message: 'Sit down slowly with control', type: 'warning' };
  }

  return { stage, reps, angle, feedback, formCorrect };
};

// ---------- 8. Squats ----------

export const detectSquat: ExerciseDetector = (landmarks, prev) => {
  let side = pickSide(
    landmarks,
    [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE],
    [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
  );
  if (!side) side = 'right';

  const H = side === 'left' ? LM.LEFT_HIP : LM.RIGHT_HIP;
  const K = side === 'left' ? LM.LEFT_KNEE : LM.RIGHT_KNEE;
  const A = side === 'left' ? LM.LEFT_ANKLE : LM.RIGHT_ANKLE;

  const rawAngle = calculateAngle(landmarks[H], landmarks[K], landmarks[A]);
  const angle = smoothAngle('squat_' + side, rawAngle);

  // Also check back posture during squat
  const S = side === 'left' ? LM.LEFT_SHOULDER : LM.RIGHT_SHOULDER;
  const backLean = Math.abs(landmarks[S].x - landmarks[H].x);

  let stage = prev.stage;
  let reps = prev.reps;

  // Squat thresholds: LOW = 100 (squatted), HIGH = 150 (standing)
  if (angle > 150) {
    if (stage === 'down') reps++;
    stage = 'up';
  } else if (angle < 100) {
    stage = 'down';
  }

  const formCorrect =
    (stage === 'down' && angle < 105 && angle > 55) ||
    (stage === 'up' && angle > 145) ||
    stage === 'idle';

  let feedback: FeedbackInfo;
  if (backLean > 0.15) {
    feedback = { message: 'Keep your back straight', type: 'warning' };
  } else if (formCorrect) {
    feedback = { message: 'Perfect form! Keep it up!', type: 'correct' };
  } else if (stage === 'down' && angle > 110) {
    feedback = { message: 'Go lower, bend your knees more', type: 'warning' };
  } else if (stage === 'down' && angle < 55) {
    feedback = { message: 'Don\'t go too deep, protect your knees', type: 'error' };
  } else {
    feedback = { message: 'Control the movement', type: 'warning' };
  }

  return { stage, reps, angle, feedback, formCorrect };
};

// ---------- 9. Back Straightening ----------

export const detectBackStraightening: ExerciseDetector = (landmarks, prev) => {
  if (
    !areVisible(landmarks, [
      LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
      LM.LEFT_HIP, LM.RIGHT_HIP,
    ])
  )
    return null;

  // Midpoints
  const midShoulder: Landmark = {
    x: (landmarks[LM.LEFT_SHOULDER].x + landmarks[LM.RIGHT_SHOULDER].x) / 2,
    y: (landmarks[LM.LEFT_SHOULDER].y + landmarks[LM.RIGHT_SHOULDER].y) / 2,
    z: (landmarks[LM.LEFT_SHOULDER].z + landmarks[LM.RIGHT_SHOULDER].z) / 2,
  };
  const midHip: Landmark = {
    x: (landmarks[LM.LEFT_HIP].x + landmarks[LM.RIGHT_HIP].x) / 2,
    y: (landmarks[LM.LEFT_HIP].y + landmarks[LM.RIGHT_HIP].y) / 2,
    z: (landmarks[LM.LEFT_HIP].z + landmarks[LM.RIGHT_HIP].z) / 2,
  };

  // Virtual point directly above hip (perfect posture reference)
  const aboveHip: Landmark = { x: midHip.x, y: midHip.y - 0.3, z: midHip.z };

  const rawAngle = calculateAngle(aboveHip, midHip, midShoulder);
  const angle = smoothAngle('back_straighten', rawAngle);

  let stage = prev.stage;
  let reps = prev.reps;

  if (angle > 15) {
    stage = 'down';
  } else if (angle < 8) {
    if (stage === 'down') reps++;
    stage = 'up';
  }

  const formCorrect = angle < 10;

  let feedback: FeedbackInfo;
  if (formCorrect) {
    feedback = { message: 'Great posture! Back is straight', type: 'correct' };
  } else if (angle > 25) {
    feedback = { message: 'Incorrect posture — straighten your back', type: 'error' };
  } else {
    feedback = { message: 'Straighten your back a little more', type: 'warning' };
  }

  return { stage, reps, angle, feedback, formCorrect };
};

// ---------- 10. Neck Alignment ----------

export const detectNeckAlignment: ExerciseDetector = (landmarks, prev) => {
  let side = pickSide(
    landmarks,
    [LM.LEFT_EAR, LM.LEFT_SHOULDER],
    [LM.RIGHT_EAR, LM.RIGHT_SHOULDER],
  );
  if (!side) side = 'right';

  const earIdx = side === 'left' ? LM.LEFT_EAR : LM.RIGHT_EAR;
  const shoulderIdx = side === 'left' ? LM.LEFT_SHOULDER : LM.RIGHT_SHOULDER;
  const hipIdx = side === 'left' ? LM.LEFT_HIP : LM.RIGHT_HIP;

  if (!areVisible(landmarks, [hipIdx])) return null;

  const rawAngle = calculateAngle(
    landmarks[earIdx],
    landmarks[shoulderIdx],
    landmarks[hipIdx],
  );
  const angle = smoothAngle('neck_' + side, rawAngle);

  let stage = prev.stage;
  let reps = prev.reps;

  if (angle < 150) {
    stage = 'down';
  } else if (angle > 165) {
    if (stage === 'down') reps++;
    stage = 'up';
  }

  const formCorrect = angle > 160;

  let feedback: FeedbackInfo;
  if (formCorrect) {
    feedback = { message: 'Neck aligned perfectly!', type: 'correct' };
  } else if (angle < 140) {
    feedback = { message: 'Incorrect posture — pull chin back', type: 'error' };
  } else {
    feedback = { message: 'Tuck your chin in slightly', type: 'warning' };
  }

  return { stage, reps, angle, feedback, formCorrect };
};

// ---------- 11. Arm Raise Rehab ----------

export const detectArmRaiseRehab: ExerciseDetector = (landmarks, prev) => {
  let side = pickSide(
    landmarks,
    [LM.LEFT_HIP, LM.LEFT_SHOULDER, LM.LEFT_WRIST],
    [LM.RIGHT_HIP, LM.RIGHT_SHOULDER, LM.RIGHT_WRIST],
  );
  if (!side) side = 'right';

  const H = side === 'left' ? LM.LEFT_HIP : LM.RIGHT_HIP;
  const S = side === 'left' ? LM.LEFT_SHOULDER : LM.RIGHT_SHOULDER;
  const W = side === 'left' ? LM.LEFT_WRIST : LM.RIGHT_WRIST;

  const rawAngle = calculateAngle(landmarks[H], landmarks[S], landmarks[W]);
  const angle = smoothAngle('arm_raise_' + side, rawAngle);

  let stage = prev.stage;
  let reps = prev.reps;

  if (angle < 15) {
    stage = 'down';
  } else if (angle > 65) {
    if (stage === 'down') reps++;
    stage = 'up';
  }

  const formCorrect =
    (stage === 'up' && angle > 60) ||
    (stage === 'down' && angle < 20) ||
    stage === 'idle';

  let feedback: FeedbackInfo;
  if (formCorrect) {
    feedback = { message: 'Perfect form! Keep it up!', type: 'correct' };
  } else if (stage === 'up') {
    feedback = { message: 'Raise your arm higher', type: 'warning' };
  } else {
    feedback = { message: 'Good, lower your arm slowly', type: 'warning' };
  }

  return { stage, reps, angle, feedback, formCorrect };
};

// ---------- 12. Single Leg Stand ----------

export const detectSingleLegStand: ExerciseDetector = (landmarks, prev) => {
  let side = pickSide(
    landmarks,
    [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE],
    [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
  );
  if (!side) side = 'right';

  const H = side === 'left' ? LM.LEFT_HIP : LM.RIGHT_HIP;
  const K = side === 'left' ? LM.LEFT_KNEE : LM.RIGHT_KNEE;
  const A = side === 'left' ? LM.LEFT_ANKLE : LM.RIGHT_ANKLE;

  const rawAngle = calculateAngle(landmarks[H], landmarks[K], landmarks[A]);
  const angle = smoothAngle('single_leg_' + side, rawAngle);

  let stage = prev.stage;
  let reps = prev.reps;

  if (angle < 120) {
    stage = 'down';
  } else if (angle > 165) {
    if (stage === 'down') reps++;
    stage = 'up';
  }

  const formCorrect = angle > 160;

  let feedback: FeedbackInfo;
  if (formCorrect) {
    feedback = { message: 'Great balance! Hold steady!', type: 'correct' };
  } else if (angle < 140) {
    feedback = { message: 'Straighten your standing leg', type: 'warning' };
  } else {
    feedback = { message: 'Keep your balance, engage your core', type: 'warning' };
  }

  return { stage, reps, angle, feedback, formCorrect };
};

// ---------- 13. Heel Raises ----------

export const detectHeelRaises: ExerciseDetector = (landmarks, prev) => {
  let side = pickSide(
    landmarks,
    [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE],
    [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
  );
  if (!side) side = 'right';

  const H = side === 'left' ? LM.LEFT_HIP : LM.RIGHT_HIP;
  const K = side === 'left' ? LM.LEFT_KNEE : LM.RIGHT_KNEE;
  const A = side === 'left' ? LM.LEFT_ANKLE : LM.RIGHT_ANKLE;

  const rawAngle = calculateAngle(landmarks[H], landmarks[K], landmarks[A]);
  const angle = smoothAngle('heel_raise_' + side, rawAngle);

  let stage = prev.stage;
  let reps = prev.reps;

  // Heel raises: standing straight (high angle) then slight knee dip on raise
  if (angle > 170) {
    stage = 'down';
  } else if (angle < 165) {
    if (stage === 'down') reps++;
    stage = 'up';
  }

  const formCorrect =
    (stage === 'up' && angle < 168) ||
    (stage === 'down' && angle > 168) ||
    stage === 'idle';

  let feedback: FeedbackInfo;
  if (formCorrect) {
    feedback = { message: 'Perfect form! Rise up on your toes!', type: 'correct' };
  } else if (stage === 'up') {
    feedback = { message: 'Push higher onto your toes', type: 'warning' };
  } else {
    feedback = { message: 'Lower your heels slowly', type: 'warning' };
  }

  return { stage, reps, angle, feedback, formCorrect };
};

// ---------- 14. Toe Raises ----------

export const detectToeRaises: ExerciseDetector = (landmarks, prev) => {
  let side = pickSide(
    landmarks,
    [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE],
    [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
  );
  if (!side) side = 'right';

  const H = side === 'left' ? LM.LEFT_HIP : LM.RIGHT_HIP;
  const K = side === 'left' ? LM.LEFT_KNEE : LM.RIGHT_KNEE;
  const A = side === 'left' ? LM.LEFT_ANKLE : LM.RIGHT_ANKLE;

  const rawAngle = calculateAngle(landmarks[H], landmarks[K], landmarks[A]);
  const angle = smoothAngle('toe_raise_' + side, rawAngle);

  let stage = prev.stage;
  let reps = prev.reps;

  if (angle > 170) {
    stage = 'down';
  } else if (angle < 165) {
    if (stage === 'down') reps++;
    stage = 'up';
  }

  const formCorrect =
    (stage === 'up' && angle < 168) ||
    (stage === 'down' && angle > 168) ||
    stage === 'idle';

  let feedback: FeedbackInfo;
  if (formCorrect) {
    feedback = { message: 'Perfect form! Lift those toes!', type: 'correct' };
  } else if (stage === 'up') {
    feedback = { message: 'Lift your toes higher', type: 'warning' };
  } else {
    feedback = { message: 'Lower your toes slowly', type: 'warning' };
  }

  return { stage, reps, angle, feedback, formCorrect };
};

// ---------- 15. Basic Core Activation ----------

export const detectBasicCoreActivation: ExerciseDetector = (landmarks, prev) => {
  if (
    !areVisible(landmarks, [
      LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
      LM.LEFT_HIP, LM.RIGHT_HIP,
    ])
  )
    return null;

  const midShoulder: Landmark = {
    x: (landmarks[LM.LEFT_SHOULDER].x + landmarks[LM.RIGHT_SHOULDER].x) / 2,
    y: (landmarks[LM.LEFT_SHOULDER].y + landmarks[LM.RIGHT_SHOULDER].y) / 2,
    z: (landmarks[LM.LEFT_SHOULDER].z + landmarks[LM.RIGHT_SHOULDER].z) / 2,
  };
  const midHip: Landmark = {
    x: (landmarks[LM.LEFT_HIP].x + landmarks[LM.RIGHT_HIP].x) / 2,
    y: (landmarks[LM.LEFT_HIP].y + landmarks[LM.RIGHT_HIP].y) / 2,
    z: (landmarks[LM.LEFT_HIP].z + landmarks[LM.RIGHT_HIP].z) / 2,
  };

  const aboveHip: Landmark = { x: midHip.x, y: midHip.y - 0.3, z: midHip.z };

  const rawAngle = calculateAngle(aboveHip, midHip, midShoulder);
  const angle = smoothAngle('core_activation', rawAngle);

  let stage = prev.stage;
  let reps = prev.reps;

  if (angle > 15) {
    stage = 'down';
  } else if (angle < 8) {
    if (stage === 'down') reps++;
    stage = 'up';
  }

  const formCorrect = angle < 10;

  let feedback: FeedbackInfo;
  if (formCorrect) {
    feedback = { message: 'Core engaged! Great posture!', type: 'correct' };
  } else if (angle > 25) {
    feedback = { message: 'Engage your core — tighten your abs', type: 'error' };
  } else {
    feedback = { message: 'Brace your core a little more', type: 'warning' };
  }

  return { stage, reps, angle, feedback, formCorrect };
};

// ============================================================
// Detector Registry
// ============================================================

export const exerciseDetectors: Record<ExerciseType, ExerciseDetector> = {
  elbow_flexion: detectElbowFlexion,
  shoulder_abduction: detectShoulderAbduction,
  shoulder_abduction_stretch: detectShoulderAbductionStretch,
  shoulder_flexion: detectShoulderFlexion,
  shoulder_internal_external_rotation: detectShoulderInternalExternalRotation,
  arm_raise_rehab: detectArmRaiseRehab,
  knee_rotation: detectKneeRotation,
  straight_leg_raise: detectStraightLegRaise,
  sit_to_stand: detectSitToStand,
  squat: detectSquat,
  single_leg_stand: detectSingleLegStand,
  heel_raises: detectHeelRaises,
  toe_raises: detectToeRaises,
  back_straightening: detectBackStraightening,
  neck_alignment: detectNeckAlignment,
  basic_core_activation: detectBasicCoreActivation,
};

// ============================================================
// Camera Positioning Validation
// ============================================================

/** Required landmarks for full body visibility check */
const FULL_BODY_LANDMARKS = [
  LM.NOSE, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
  LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_KNEE,
  LM.RIGHT_KNEE, LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
];

export interface PositionValidation {
  isValid: boolean;
  warning: string | null;
}

/**
 * Validate the user's camera position before starting exercise.
 * Returns a warning message if position needs adjustment, or null if OK.
 * Checks: body detected, full body visible, centering, distance, posture, facing.
 */
export function validateCameraPosition(landmarks: Landmark[] | null): PositionValidation {
  // 1. No landmarks at all — user not detected
  if (!landmarks || landmarks.length === 0) {
    return { isValid: false, warning: 'Stand in front of the camera' };
  }

  // 2. Check full body visibility
  const missingCount = FULL_BODY_LANDMARKS.filter(i => {
    const lm = landmarks[i];
    return !lm || (lm.visibility !== undefined && lm.visibility < 0.5);
  }).length;

  if (missingCount > 2) {
    return { isValid: false, warning: 'Make sure your full body is visible' };
  }

  // Get reference points for remaining checks
  const leftShoulder = landmarks[LM.LEFT_SHOULDER];
  const rightShoulder = landmarks[LM.RIGHT_SHOULDER];
  const leftHip = landmarks[LM.LEFT_HIP];
  const rightHip = landmarks[LM.RIGHT_HIP];
  const nose = landmarks[LM.NOSE];

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return { isValid: false, warning: 'Make sure your full body is visible' };
  }

  // 3. Check horizontal alignment (body center in frame)
  const centerX = (leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) / 4;
  if (centerX < 0.25) {
    return { isValid: false, warning: 'Move slightly to the right' };
  }
  if (centerX > 0.75) {
    return { isValid: false, warning: 'Move slightly to the left' };
  }

  // 4. Check distance (shoulder width as proxy)
  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
  if (shoulderWidth < 0.05) {
    return { isValid: false, warning: 'Come closer to the camera' };
  }
  if (shoulderWidth > 0.6) {
    return { isValid: false, warning: 'Move back a little' };
  }

  // 5. Check posture (leaning) — shoulder-hip vertical alignment
  const midShoulderX = (leftShoulder.x + rightShoulder.x) / 2;
  const midHipX = (leftHip.x + rightHip.x) / 2;
  if (Math.abs(midShoulderX - midHipX) > 0.08) {
    return { isValid: false, warning: 'Stand straight' };
  }

  // 6. Check facing direction (shoulder depth difference)
  const shoulderDepthDiff = Math.abs(leftShoulder.z - rightShoulder.z);
  if (shoulderDepthDiff > 0.15) {
    return { isValid: false, warning: 'Face the camera properly' };
  }

  // 7. Check neck alignment if nose is visible
  if (nose && nose.visibility !== undefined && nose.visibility > 0.5) {
    const midShoulderXForNose = (leftShoulder.x + rightShoulder.x) / 2;
    if (Math.abs(nose.x - midShoulderXForNose) > 0.12) {
      return { isValid: false, warning: 'Face the camera properly' };
    }
  }

  return { isValid: true, warning: null };
}
