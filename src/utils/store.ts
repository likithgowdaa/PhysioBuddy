// ============================================================
// store.ts — PhysioBuddy Shared State Store
// ============================================================

import type { ExerciseType } from './poseUtils';

// ----- Types -----

export interface UserInfo {
  id: string; // Supabase auth user ID (or "local_<timestamp>" for offline fallback)
  name: string;
  email: string;
  isLocalUser?: boolean; // true when created as offline fallback
}

export interface SessionRecord {
  id: string;
  exerciseType: ExerciseType;
  exerciseName: string;
  reps: number;
  accuracy: number;
  incorrectReps: number;
  duration: number; // seconds
  calories: number;
  date: string; // ISO string
}

export interface LiveSessionData {
  exerciseType: ExerciseType;
  exerciseName: string;
  reps: number;
  accuracy: number;
  incorrectReps: number;
  duration: number;
  calories: number;
}

export interface AppState {
  user: UserInfo | null;
  selectedExercise: ExerciseType;
  sessions: SessionRecord[];
  currentSession: LiveSessionData | null;
}

// ----- Constants -----

const STORAGE_KEY = 'physiobuddy_state';

// ----- Default State -----

const defaultState: AppState = {
  user: null,
  selectedExercise: 'knee_rotation',
  sessions: [],
  currentSession: null,
};

// ----- Internal -----

type Listener = () => void;
const listeners: Set<Listener> = new Set();
let cachedState: AppState | null = null;

// ----- Core API -----

/** Get the current app state (reads from localStorage on first call). */
export function getState(): AppState {
  if (cachedState) return cachedState;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      cachedState = { ...defaultState, ...JSON.parse(raw) };
      return cachedState!;
    }
  } catch {
    // corrupted storage — reset
  }
  cachedState = { ...defaultState };
  return cachedState;
}

/** Update partial state, persist, and notify subscribers. */
export function setState(partial: Partial<AppState>): void {
  cachedState = { ...getState(), ...partial };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedState));
  } catch {
    // storage full — silently fail
  }
  listeners.forEach((fn) => fn());
}

/** Subscribe to state changes. Returns unsubscribe function. */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ----- Network Error Detection -----

import { supabase } from '../lib/supabase';
import { isNetworkError } from '../services/authService';

// ----- Local User Helpers -----

/** Check if the current user is a local (offline) fallback user. */
export function isCurrentUserLocal(): boolean {
  const user = getState().user;
  return !!user?.isLocalUser || (!!user && user.id.startsWith('local_'));
}

/** Create a local fallback user. Only used when network is unreachable. */
function createLocalFallbackUser(name: string, email: string): UserInfo {
  console.warn('[PhysioBuddy] ⚠️ FALLBACK ACTIVATED — creating local user (network unreachable)');
  console.warn('[PhysioBuddy] ⚠️ Local users CANNOT write to the database');
  return {
    id: 'local_' + Date.now(),
    name: name || email.split('@')[0] || 'Offline User',
    email,
    isLocalUser: true,
  };
}

// ----- Supabase Auth Helpers -----

/**
 * Register a new user via Supabase Auth.
 * Verifies user via getUser() after creation.
 * Returns error message or null on success.
 */
export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<string | null> {
  if (!name.trim()) return 'Name is required';
  if (!email.trim() || !email.includes('@')) return 'Valid email is required';
  if (password.length < 6) return 'Password must be at least 6 characters';

  try {
    console.log('[PhysioBuddy] signUp attempt:', email);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { name: name.trim() } },
    });

    if (error) {
      console.error('[PhysioBuddy] Supabase signUp error:', error.message);
      return error.message;
    }

    if (!data.user) {
      return 'Sign-up failed. Please try again.';
    }

    // Verify the user was actually created by checking with the server
    const { data: verifiedData, error: verifyError } = await supabase.auth.getUser();
    console.log('[PhysioBuddy] signUp getUser() verification:', {
      userId: verifiedData?.user?.id ?? null,
      error: verifyError?.message ?? null,
    });

    // Use verified user if available, otherwise the signUp response user
    // (Supabase may require email confirmation before getUser() works)
    const finalUser = verifiedData?.user ?? data.user;

    setState({
      user: {
        id: finalUser.id,
        name: name.trim(),
        email: finalUser.email ?? email.trim().toLowerCase(),
        isLocalUser: false,
      },
    });

    console.log('[PhysioBuddy] ✅ signUp success, user stored:', finalUser.id);
    return null;
  } catch (err) {
    console.error('[PhysioBuddy] signUp exception:', err);

    // ONLY create local fallback on genuine network errors
    if (isNetworkError(err)) {
      console.warn('[PhysioBuddy] ⚠️ Network error during signUp — activating local fallback');
      const localUser = createLocalFallbackUser(name, email);
      setState({ user: localUser });
      return null; // Allow offline access
    }

    return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Log in a user via Supabase Auth.
 * CRITICAL: Always verifies via getUser() after signInWithPassword.
 * If getUser() returns null → login is REJECTED (no fallback to data.user).
 * Returns error message or null on success.
 */
export async function loginUser(
  email: string,
  password: string,
): Promise<string | null> {
  if (!email.trim() || !email.includes('@')) return 'Valid email is required';
  if (!password) return 'Password is required';

  try {
    console.log('[PhysioBuddy] login attempt:', email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    console.log('[PhysioBuddy] signInWithPassword result:', {
      userId: data?.user?.id ?? null,
      hasSession: !!data?.session,
      error: error?.message ?? null,
    });

    if (error) {
      console.error('[PhysioBuddy] Supabase login error:', error.message);
      // DO NOT fallback for invalid credentials — return the error
      return error.message;
    }

    if (!data.user || !data.session) {
      return 'Login failed. Please try again.';
    }

    // CRITICAL: Always verify via getUser() — server-verified check
    const { data: verifiedData, error: verifyError } = await supabase.auth.getUser();

    console.log('[PhysioBuddy] login getUser() verification:', {
      userId: verifiedData?.user?.id ?? null,
      email: verifiedData?.user?.email ?? null,
      error: verifyError?.message ?? null,
    });

    // STRICT: If getUser() returns null, REJECT the login entirely
    if (verifyError || !verifiedData?.user) {
      console.error('[PhysioBuddy] ❌ login REJECTED — getUser() returned null after signInWithPassword');
      // Sign out the potentially invalid session
      await supabase.auth.signOut();
      return 'Login verification failed. Please try again.';
    }

    // Use ONLY the verified user — never fall back to data.user
    const user = verifiedData.user;
    const displayName =
      user.user_metadata?.name ??
      user.email?.split('@')[0] ??
      'User';

    setState({
      user: {
        id: user.id,
        name: displayName,
        email: user.email ?? email.trim().toLowerCase(),
        isLocalUser: false,
      },
    });

    console.log('[PhysioBuddy] ✅ login verified and stored:', user.id);
    return null;
  } catch (err) {
    console.error('[PhysioBuddy] login exception:', err);

    // ONLY create local fallback on genuine network errors
    if (isNetworkError(err)) {
      console.warn('[PhysioBuddy] ⚠️ Network error during login — activating local fallback');
      const localUser = createLocalFallbackUser('', email);
      setState({ user: localUser });
      return null; // Allow offline access
    }

    return 'An unexpected error occurred. Please try again.';
  }
}

/** Log out the current user via Supabase Auth. */
export async function logoutUser(): Promise<void> {
  try {
    await supabase.auth.signOut();
    console.log('[PhysioBuddy] Supabase signOut complete');
  } catch (err) {
    console.error('[PhysioBuddy] logout error:', err);
  }
  setState({ user: null });
}

/**
 * Restore user state from the existing Supabase session on app load.
 * 1. Checks existing session via getSession()
 * 2. Subscribes to onAuthStateChange for real-time auth events
 *    (SIGNED_IN, SIGNED_OUT, PASSWORD_RECOVERY)
 *
 * Call this once at app startup (App.tsx useEffect).
 */
export async function restoreSession(): Promise<void> {
  // 1. Restore from existing session
  try {
    const { data: { session } } = await supabase.auth.getSession();
    console.log('[PhysioBuddy] restoreSession getSession():', {
      hasSession: !!session,
      userId: session?.user?.id ?? null,
      email: session?.user?.email ?? null,
    });

    if (session?.user) {
      const u = session.user;
      const displayName = u.user_metadata?.name ?? u.email?.split('@')[0] ?? 'User';
      setState({
        user: {
          id: u.id,
          name: displayName,
          email: u.email ?? '',
          isLocalUser: false,
        },
      });
      console.log('[PhysioBuddy] ✅ Session restored for:', u.email);
    } else {
      // No session — only clear if no local user is stored
      const current = getState().user;
      if (!current?.isLocalUser) {
        setState({ user: null });
      }
    }
  } catch (err) {
    console.error('[PhysioBuddy] restoreSession error:', err);
    // Keep whatever state exists (could be a local fallback user)
  }

  // 2. Subscribe to auth state changes for real-time updates
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('[PhysioBuddy] onAuthStateChange:', event, 'user:', session?.user?.email ?? null);

    switch (event) {
      case 'SIGNED_IN':
      case 'TOKEN_REFRESHED': {
        if (session?.user) {
          const u = session.user;
          const displayName = u.user_metadata?.name ?? u.email?.split('@')[0] ?? 'User';
          setState({
            user: {
              id: u.id,
              name: displayName,
              email: u.email ?? '',
              isLocalUser: false,
            },
          });
          console.log('[PhysioBuddy] ✅ Auth state updated (SIGNED_IN):', u.email);
        }
        break;
      }

      case 'SIGNED_OUT': {
        setState({ user: null });
        console.log('[PhysioBuddy] Auth state cleared (SIGNED_OUT)');
        break;
      }

      case 'PASSWORD_RECOVERY': {
        console.log('[PhysioBuddy] PASSWORD_RECOVERY event — redirecting to /reset-password');
        // Redirect to the reset password page
        if (window.location.pathname !== '/reset-password') {
          window.location.href = '/reset-password';
        }
        break;
      }

      default:
        // USER_UPDATED, MFA_CHALLENGE_VERIFIED, etc. — no action needed
        break;
    }
  });
}

// ----- Session Helpers -----

/** Save current live session as a completed session record. */
export async function archiveCurrentSession(): Promise<SessionRecord | null> {
  const state = getState();
  if (!state.currentSession) return null;

  // Block local (offline) users from writing to Supabase
  if (isCurrentUserLocal()) {
    console.warn('[PhysioBuddy] ⚠️ BLOCKED: Local user cannot save sessions to database');
    // Still save locally for offline use
    const record: SessionRecord = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ...state.currentSession,
      date: new Date().toISOString(),
    };
    const sessions = [...state.sessions, record];
    setState({ sessions, currentSession: null });
    return record;
  }

  // Strict auth check — require authenticated Supabase user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('[PhysioBuddy] Cannot archive session — no authenticated Supabase user');
    return null;
  }

  const record: SessionRecord = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    ...state.currentSession,
    date: new Date().toISOString(),
  };

  const sessions = [...state.sessions, record];
  setState({ sessions, currentSession: null });

  // Push to Supabase
  try {
    const { saveSession } = await import('../services/sessionService');
    await saveSession({
      exerciseType: record.exerciseType,
      exerciseName: record.exerciseName,
      reps: record.reps,
      accuracy: record.accuracy,
      incorrectReps: record.incorrectReps,
      duration: record.duration,
      calories: record.calories,
    });
  } catch (err) {
    console.error('[PhysioBuddy] Failed to save session to Supabase:', err);
  }

  return record;
}

/** Get sessions for today. */
export function getTodaySessions(): SessionRecord[] {
  const today = new Date().toDateString();
  return getState().sessions.filter(
    (s) => new Date(s.date).toDateString() === today,
  );
}

/** Get sessions for this week (last 7 days). */
export function getWeekSessions(): SessionRecord[] {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return getState().sessions.filter(
    (s) => new Date(s.date).getTime() >= weekAgo,
  );
}

/** Get sessions for this month (last 30 days). */
export function getMonthSessions(): SessionRecord[] {
  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return getState().sessions.filter(
    (s) => new Date(s.date).getTime() >= monthAgo,
  );
}

/** Calculate streak (consecutive days with at least 1 session). */
export function getStreak(): number {
  const sessions = getState().sessions;
  if (sessions.length === 0) return 0;

  const daySet = new Set(
    sessions.map((s) => new Date(s.date).toDateString()),
  );

  let streak = 0;
  const day = new Date();
  while (daySet.has(day.toDateString())) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

/** Calorie estimate based on exercise type and duration. */
export function estimateCalories(
  exerciseType: ExerciseType,
  durationSeconds: number,
): number {
  // Rough MET values for physiotherapy exercises
  const metValues: Record<string, number> = {
    elbow_flexion: 2.5,
    shoulder_abduction: 2.8,
    shoulder_abduction_stretch: 2.5,
    shoulder_flexion: 2.8,
    shoulder_internal_external_rotation: 2.0,
    arm_raise_rehab: 2.5,
    knee_rotation: 3.0,
    straight_leg_raise: 3.0,
    sit_to_stand: 4.0,
    squat: 5.0,
    single_leg_stand: 2.5,
    heel_raises: 3.0,
    toe_raises: 2.5,
    back_straightening: 2.0,
    neck_alignment: 1.5,
    basic_core_activation: 2.5,
  };
  const met = metValues[exerciseType] ?? 2.5;
  // Calories = MET × weight(kg) × duration(hours); assume 70kg
  return Math.round(met * 70 * (durationSeconds / 3600));
}

// ----- Exercise Metadata -----

export interface ExerciseInfo {
  type: ExerciseType;
  name: string;
  category: 'Upper Body' | 'Lower Body' | 'Posture / Rehab';
  difficulty: 'Beginner' | 'Intermediate';
  duration: string;
  targetArea: string;
}

export const allExercises: ExerciseInfo[] = [
  // Upper Body
  { type: 'elbow_flexion', name: 'Elbow Flexion / Extension', category: 'Upper Body', difficulty: 'Beginner', duration: '8 min', targetArea: 'Elbow / Biceps' },
  { type: 'shoulder_abduction', name: 'Shoulder Abduction', category: 'Upper Body', difficulty: 'Beginner', duration: '10 min', targetArea: 'Shoulder / Deltoids' },
  { type: 'shoulder_abduction_stretch', name: 'Shoulder Abduction Stretch', category: 'Upper Body', difficulty: 'Beginner', duration: '8 min', targetArea: 'Shoulder / Deltoids' },
  { type: 'shoulder_flexion', name: 'Shoulder Flexion', category: 'Upper Body', difficulty: 'Beginner', duration: '10 min', targetArea: 'Shoulder / Anterior Deltoid' },
  { type: 'shoulder_internal_external_rotation', name: 'Shoulder Internal & External Rotation', category: 'Upper Body', difficulty: 'Intermediate', duration: '10 min', targetArea: 'Rotator Cuff' },
  { type: 'arm_raise_rehab', name: 'Arm Raise Rehab', category: 'Upper Body', difficulty: 'Beginner', duration: '8 min', targetArea: 'Shoulder / Deltoids' },
  // Lower Body
  { type: 'knee_rotation', name: 'Knee Rotation', category: 'Lower Body', difficulty: 'Beginner', duration: '10 min', targetArea: 'Knee / Quadriceps' },
  { type: 'straight_leg_raise', name: 'Straight Leg Raise', category: 'Lower Body', difficulty: 'Beginner', duration: '8 min', targetArea: 'Hip Flexors / Quadriceps' },
  { type: 'sit_to_stand', name: 'Sit to Stand', category: 'Lower Body', difficulty: 'Beginner', duration: '10 min', targetArea: 'Quadriceps / Glutes' },
  { type: 'squat', name: 'Controlled Squats', category: 'Lower Body', difficulty: 'Intermediate', duration: '12 min', targetArea: 'Quadriceps / Glutes / Knees' },
  { type: 'single_leg_stand', name: 'Single Leg Stand', category: 'Lower Body', difficulty: 'Beginner', duration: '8 min', targetArea: 'Balance / Glutes' },
  { type: 'heel_raises', name: 'Heel Raises', category: 'Lower Body', difficulty: 'Beginner', duration: '8 min', targetArea: 'Calves / Ankles' },
  { type: 'toe_raises', name: 'Toe Raises', category: 'Lower Body', difficulty: 'Beginner', duration: '8 min', targetArea: 'Shins / Ankles' },
  // Posture / Rehab
  { type: 'back_straightening', name: 'Back Straightening', category: 'Posture / Rehab', difficulty: 'Beginner', duration: '8 min', targetArea: 'Spine / Core' },
  { type: 'neck_alignment', name: 'Neck Alignment', category: 'Posture / Rehab', difficulty: 'Beginner', duration: '6 min', targetArea: 'Cervical Spine' },
  { type: 'basic_core_activation', name: 'Basic Core Activation', category: 'Posture / Rehab', difficulty: 'Beginner', duration: '8 min', targetArea: 'Core / Abdominals' },
];

/** Look up exercise info by type. */
export function getExerciseInfo(type: ExerciseType): ExerciseInfo {
  return allExercises.find((e) => e.type === type) ?? allExercises[6]; // default knee_rotation
}
