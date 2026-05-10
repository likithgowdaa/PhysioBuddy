// ============================================================
// useExerciseLogic.ts — PhysioBuddy Exercise State Manager
// ============================================================

import { useState, useCallback, useRef } from 'react';
import {
  type ExerciseType,
  type ExerciseState,
  type FeedbackInfo,
  type Landmark,
  exerciseDetectors,
  idleState,
  resetSmoothing,
  validateCameraPosition,
  isExerciseVisible,
} from '../utils/poseUtils';
import {
  triggerPersistentAlert,
  speakSmart,
  playSuccessBeep,
  resetAlertThrottle,
  speakPositionWarning,
} from '../utils/audioUtils';
import { getState } from '../utils/store';

export interface ExerciseData {
  reps: number;
  stage: 'up' | 'down' | 'idle';
  feedback: FeedbackInfo;
  accuracy: number;
  angle: number;
  bodyDetected: boolean;
  isCalibrated: boolean;
}

export interface CalibrationBaseline {
  minAngle: number;
  maxAngle: number;
}

// Number of consecutive valid frames required before bodyDetected = true
const BODY_STABLE_FRAMES = 3;

// ---- Session management ----
const MAX_REPS = 10;

// (Session count for accuracy is read from store — persists across page reloads)

/**
 * Custom React hook that manages all exercise tracking state.
 * Features:
 *  - Stage-based rep counting with hysteresis + cooldown
 *  - Rolling angle buffer for jitter reduction
 *  - Persistent error alerts (8+ consecutive bad frames)
 *  - Visibility-based frame rejection
 *  - Per-rep accuracy tracking
 *  - Stable body detection buffer
 */
export function useExerciseLogic(exerciseType: ExerciseType, onSessionComplete?: () => void) {
  const [reps, setReps] = useState(0);
  const [stage, setStage] = useState<'up' | 'down' | 'idle'>('idle');
  const [feedback, setFeedback] = useState<FeedbackInfo>({
    message: 'Get ready to start',
    type: 'correct',
  });
  const [accuracy, setAccuracy] = useState(60);
  const [angle, setAngle] = useState(0);
  const [bodyDetected, setBodyDetected] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(false);

  // Internal refs
  const stateRef = useRef<ExerciseState>(idleState());

  // NOTE: Accuracy is purely session-based (not frame/form-based)
  // correctFrames/totalFrames/correctReps removed — they no longer affect accuracy

  // ---- Rep counting: track stage transitions directly ----
  const confirmedStageRef = useRef<'up' | 'down' | 'idle'>('idle');
  const stageHoldCountRef = useRef(0);
  const STAGE_HOLD_THRESHOLD = 4; // Frames needed to confirm stage (at 10 FPS = 400ms)
  const pendingStageRef = useRef<'up' | 'down' | 'idle'>('idle');
  const lastRepTimeRef = useRef(0);
  const REP_COOLDOWN_MS = 1200; // 1.2s minimum between reps (prevents skipping)
  const internalRepsRef = useRef(0);
  const repLockRef = useRef(false); // Prevents concurrent frame double-counting

  // ---- Session end guard ----
  const sessionEndedRef = useRef(false);

  // ---- Accuracy: set ONCE per session ----
  const accuracySetRef = useRef(false);

  // Consecutive error frame counter for persistent alerts
  const consecutiveErrorFramesRef = useRef(0);

  // ---- Stable body detection buffer ----
  const consecutiveValidFramesRef = useRef(0);
  const bodyDetectedRef = useRef(false);

  // Throttle state updates
  const lastUpdateRef = useRef(0);
  const UPDATE_INTERVAL_MS = 100;

  // Calibration / training mode
  const calibrationRef = useRef<CalibrationBaseline | null>(null);
  const calibrationAnglesRef = useRef<number[]>([]);
  const isCalibrating = useRef(false);

  // ---- Debug: frame counter for periodic logging ----
  const debugFrameCountRef = useRef(0);

  // ---- Position validation state ----
  const positionValidRef = useRef(false);
  const noLandmarkFramesRef = useRef(0);

  // ---- Form correction voice: only trigger on state change ----
  const lastCorrectionRef = useRef('');
  const lastCorrectionTimeRef = useRef(0);
  const CORRECTION_COOLDOWN_MS = 3000;

  // ---- Hybrid rep detection: movement-based fallback ----
  const MIN_REP_DURATION = 5000; // 5 seconds of continuous movement
  const MOVEMENT_THRESHOLD = 0.02; // Minimum Y-axis movement to count as active
  const movementStartTimeRef = useRef<number | null>(null);
  const prevKeyPositionRef = useRef<number | null>(null);
  const movementRepCooldownRef = useRef(0); // Prevent double-counting with angle reps

  const processLandmarks = useCallback(
    (landmarks: Landmark[]) => {
      // ---- Session lock: stop ALL processing after session ends ----
      if (sessionEndedRef.current) return;

      if (!landmarks || landmarks.length === 0) {
        consecutiveValidFramesRef.current = 0;
        bodyDetectedRef.current = false;
        setBodyDetected(false);

        // Camera warning: no body detected for several frames
        noLandmarkFramesRef.current++;
        if (noLandmarkFramesRef.current > 5) {
          speakPositionWarning('Adjust your position');
        }
        return;
      }

      // Reset no-landmark counter when landmarks appear
      noLandmarkFramesRef.current = 0;

      // ---- Session ended guard: stop all processing ----
      if (sessionEndedRef.current) return;

      // ---- Exercise-specific visibility check ----
      if (!isExerciseVisible(landmarks, exerciseType)) {
        consecutiveValidFramesRef.current = 0;
        bodyDetectedRef.current = false;
        setBodyDetected(false);
        speakPositionWarning('Adjust your position to fit the exercise view');
        return;
      }

      // ---- Stable body detection: require N consecutive valid frames ----
      consecutiveValidFramesRef.current++;
      if (consecutiveValidFramesRef.current < BODY_STABLE_FRAMES) {
        // Not yet stable — don't update bodyDetected yet
        if (!bodyDetectedRef.current) {
          return;
        }
      }
      bodyDetectedRef.current = true;

      const detector = exerciseDetectors[exerciseType];
      if (!detector) return;

      const result = detector(landmarks, stateRef.current);

      if (!result) {
        consecutiveValidFramesRef.current = 0;
        bodyDetectedRef.current = false;
        setBodyDetected(false);
        return;
      }

      // ---- Pre-exercise position validation ----
      // Only run position checks when exercise hasn't started yet (idle/first few reps)
      if (internalRepsRef.current === 0 && confirmedStageRef.current === 'idle') {
        const posCheck = validateCameraPosition(landmarks);
        if (!posCheck.isValid && posCheck.warning) {
          positionValidRef.current = false;
          speakPositionWarning(posCheck.warning);
          // Still allow detection to proceed so user can start moving
        } else {
          positionValidRef.current = true;
        }
      }

      // Track consecutive error frames (for persistent alerts ONLY — not accuracy)
      if (result.formCorrect) {
        consecutiveErrorFramesRef.current = 0;
      } else {
        consecutiveErrorFramesRef.current++;
      }

      // ---- Calibration: capture angles during first rep ----
      if (isCalibrating.current) {
        calibrationAnglesRef.current.push(result.angle);
      }

      // ---- Stage-based rep counting with hysteresis ----
      const detectedStage = result.stage;

      // Build hold count for the pending stage
      if (detectedStage === pendingStageRef.current) {
        stageHoldCountRef.current++;
      } else {
        pendingStageRef.current = detectedStage;
        stageHoldCountRef.current = 1;
      }

      // Confirm stage after enough consecutive frames
      let repCounted = false;
      const now = Date.now();

      if (stageHoldCountRef.current >= STAGE_HOLD_THRESHOLD) {
        const previousConfirmed = confirmedStageRef.current;
        const newConfirmed = pendingStageRef.current;

        if (newConfirmed !== previousConfirmed) {
          confirmedStageRef.current = newConfirmed;

          // Count a rep on specific transitions:
          // "down" → "up" = 1 rep completed (user went down and came back up)
          if (previousConfirmed === 'down' && newConfirmed === 'up') {
            if (
              !repLockRef.current &&
              now - lastRepTimeRef.current >= REP_COOLDOWN_MS &&
              internalRepsRef.current < MAX_REPS
            ) {
              repLockRef.current = true;
              internalRepsRef.current++;
              lastRepTimeRef.current = now;
              repCounted = true;

              // Release lock after short delay
              setTimeout(() => { repLockRef.current = false; }, 300);
            }
          }

          // Reset form tracking for next rep cycle when entering "down" stage
          if (newConfirmed === 'down') {
            // (form tracking removed — accuracy is session-based)
          }
        }
      }

      // ---- Hybrid movement-based fallback rep detection ----
      // Only fires if angle-based detection hasn't counted a rep recently
      if (!repCounted && now - lastRepTimeRef.current >= REP_COOLDOWN_MS) {
        let currentPos: number | null = null;

        const isUpperBody = [
          'elbow_flexion', 'shoulder_abduction', 'shoulder_abduction_stretch',
          'shoulder_flexion', 'shoulder_internal_external_rotation', 'arm_raise_rehab',
        ].includes(exerciseType);

        const isLowerBody = [
          'squat', 'sit_to_stand', 'heel_raises', 'toe_raises',
          'straight_leg_raise', 'knee_rotation', 'single_leg_stand',
        ].includes(exerciseType);

        const isNeck = exerciseType === 'neck_alignment';
        const isCore = exerciseType === 'back_straightening' || exerciseType === 'basic_core_activation';

        if (isUpperBody) {
          currentPos = landmarks[15]?.y ?? landmarks[16]?.y ?? null;
        } else if (isLowerBody) {
          currentPos = landmarks[27]?.y ?? landmarks[28]?.y ?? null;
        } else if (isNeck) {
          currentPos = landmarks[0]?.y ?? null;
        } else if (isCore) {
          currentPos = landmarks[23]?.y ?? landmarks[24]?.y ?? null;
        }

        if (currentPos !== null && prevKeyPositionRef.current !== null) {
          const movement = Math.abs(currentPos - prevKeyPositionRef.current);

          if (movement > MOVEMENT_THRESHOLD) {
            if (!movementStartTimeRef.current) {
              movementStartTimeRef.current = now;
            }
          } else {
            movementStartTimeRef.current = null;
          }

          // Sustained movement for MIN_REP_DURATION → count a fallback rep
          if (
            movementStartTimeRef.current &&
            now - movementStartTimeRef.current >= MIN_REP_DURATION &&
            now - movementRepCooldownRef.current >= MIN_REP_DURATION &&
            !repLockRef.current &&
            internalRepsRef.current < MAX_REPS
          ) {
            repLockRef.current = true;
            internalRepsRef.current++;
            lastRepTimeRef.current = now;
            movementRepCooldownRef.current = now;
            movementStartTimeRef.current = null;
            repCounted = true;

            setTimeout(() => { repLockRef.current = false; }, 300);
          }
        }

        prevKeyPositionRef.current = currentPos;
      }

      // Keep stateRef in sync (but use our own rep count)
      stateRef.current = {
        ...result,
        reps: internalRepsRef.current,
        stage: confirmedStageRef.current !== 'idle' ? confirmedStageRef.current : result.stage,
      };

      // ---- Debug logging: every processed frame ----
      debugFrameCountRef.current++;
      if (debugFrameCountRef.current % 10 === 0) {
        console.log(
          '[PhysioBuddy] REPS:', internalRepsRef.current,
          'ANGLE:', result.angle.toFixed(1),
          'STAGE:', confirmedStageRef.current,
          'FORM:', result.formCorrect ? 'OK' : 'BAD',
        );
      }

      // Throttle React state updates (except on rep count)
      if (!repCounted && now - lastUpdateRef.current < UPDATE_INTERVAL_MS) {
        return;
      }
      lastUpdateRef.current = now;

      // Push to React state
      setBodyDetected(true);
      setStage(confirmedStageRef.current);
      setAngle(result.angle);
      setFeedback(result.feedback);

      if (repCounted) {
        const currentReps = internalRepsRef.current;
        setReps(currentReps);
        playSuccessBeep();

        // Smart rep announcement with dedup
        if (currentReps === 1) {
          speakSmart('1 rep');
        } else {
          speakSmart(`${currentReps} reps`);
        }

        console.log('[PhysioBuddy] REP COUNTED — REPS:', currentReps, 'ANGLE:', result.angle.toFixed(1), 'STAGE:', confirmedStageRef.current);

        // Calibration: finalize after first rep
        if (isCalibrating.current && currentReps === 1) {
          finalizeCalibration();
        }
      }

      // ---- Form correction voice: only on feedback change, not every frame ----
      if (
        result.feedback.type !== 'correct' &&
        result.feedback.message !== lastCorrectionRef.current
      ) {
        const now2 = Date.now();
        if (now2 - lastCorrectionTimeRef.current > CORRECTION_COOLDOWN_MS) {
          lastCorrectionRef.current = result.feedback.message;
          lastCorrectionTimeRef.current = now2;
          speakSmart(result.feedback.message);
        }
      } else if (result.feedback.type === 'correct') {
        // Reset correction tracking when form is correct
        lastCorrectionRef.current = '';
      }

      // ---- Accuracy: set ONCE per session, persistent, locked ----
      // MUST run before MAX_REPS check — otherwise session ends with default value
      if (!accuracySetRef.current) {
        // Count past completed sessions for THIS exercise from localStorage
        const pastSessions = getState().sessions.filter(
          (s) => s.exerciseType === exerciseType,
        ).length;

        // Progressive: 60% base + 5% per past session, capped at 95%
        const accuracyValue = Math.min(60 + pastSessions * 5, 95);

        setAccuracy(accuracyValue);
        accuracySetRef.current = true;

        console.log('FORCED ACCURACY:', accuracyValue, '(past sessions:', pastSessions, ')');
      }

      // ---- Auto-end session at MAX_REPS ----
      if (internalRepsRef.current >= MAX_REPS) {
        if (!sessionEndedRef.current) {
          sessionEndedRef.current = true;

          // Reset movement state to prevent carry-over
          movementStartTimeRef.current = null;
          prevKeyPositionRef.current = null;
          repLockRef.current = false;


          speakSmart('Session complete');
          if (onSessionComplete) {
            setTimeout(() => onSessionComplete(), 800);
          }
        }
        return; // Hard stop — no further processing
      }

      // ---- Persistent alerts: only for 'error' severity after 8+ consecutive error frames ----
      if (result.feedback.type === 'error') {
        triggerPersistentAlert(
          result.feedback.message,
          consecutiveErrorFramesRef.current,
          8,
        );
      }
    },
    [exerciseType],
  );

  // ---- Calibration controls ----
  const startCalibration = useCallback(() => {
    isCalibrating.current = true;
    calibrationAnglesRef.current = [];
    calibrationRef.current = null;
    setIsCalibrated(false);
    speakSmart('Calibration started. Perform one perfect rep.');
  }, []);

  const finalizeCalibration = useCallback(() => {
    const angles = calibrationAnglesRef.current;
    if (angles.length > 5) {
      const minAngle = Math.min(...angles);
      const maxAngle = Math.max(...angles);
      calibrationRef.current = { minAngle, maxAngle };
      setIsCalibrated(true);
      speakSmart(
        `Calibration complete. Your range is ${Math.round(minAngle)} to ${Math.round(maxAngle)} degrees.`,
      );
    }
    isCalibrating.current = false;
    calibrationAnglesRef.current = [];
  }, []);

  const reset = useCallback(() => {
    setReps(0);
    setStage('idle');
    setFeedback({ message: 'Get ready to start', type: 'correct' });
    // NOTE: setAccuracy intentionally NOT called here — accuracy is set once per session
    setAngle(0);
    setBodyDetected(false);
    setIsCalibrated(false);
    stateRef.current = idleState();
    confirmedStageRef.current = 'idle';
    stageHoldCountRef.current = 0;
    pendingStageRef.current = 'idle';
    lastRepTimeRef.current = 0;
    internalRepsRef.current = 0;
    consecutiveErrorFramesRef.current = 0;
    consecutiveValidFramesRef.current = 0;
    bodyDetectedRef.current = false;
    debugFrameCountRef.current = 0;
    positionValidRef.current = false;
    noLandmarkFramesRef.current = 0;
    lastCorrectionRef.current = '';
    lastCorrectionTimeRef.current = 0;
    movementStartTimeRef.current = null;
    prevKeyPositionRef.current = null;
    movementRepCooldownRef.current = 0;
    calibrationRef.current = null;
    calibrationAnglesRef.current = [];
    isCalibrating.current = false;
    resetSmoothing();
    resetAlertThrottle();
    repLockRef.current = false;
    accuracySetRef.current = false; // Allow recalculation on next session
    sessionEndedRef.current = false;
  }, []);

  return {
    reps,
    stage,
    feedback,
    accuracy,
    angle,
    bodyDetected,
    isCalibrated,
    processLandmarks,
    startCalibration,
    reset,
  };
}
