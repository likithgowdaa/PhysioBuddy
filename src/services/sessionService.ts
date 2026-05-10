// ============================================================
// sessionService.ts — Supabase Session Persistence
// ============================================================

import { supabase } from '../lib/supabase';
import { getState } from '../utils/store';

export interface SessionRow {
  id: string;
  user_id: string;
  exercise_type: string;
  exercise_name: string;
  reps: number;
  accuracy: number;
  incorrect_reps: number;
  duration: number;
  calories: number;
  created_at: string;
}

export interface SaveSessionInput {
  exerciseType: string;
  exerciseName: string;
  reps: number;
  accuracy: number;
  incorrectReps: number;
  duration: number;
  calories: number;
}

/**
 * Get the current authenticated user ID via Supabase.
 * Uses getUser() (server-verified) to ensure the session is valid.
 */
async function getAuthUserId(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('[PhysioBuddy] getUser error:', error.message);
      return null;
    }
    if (!data.user) {
      console.warn('[PhysioBuddy] No authenticated Supabase user — cannot save session');
      return null;
    }
    return data.user.id;
  } catch (err) {
    console.error('[PhysioBuddy] getAuthUserId exception:', err);
    return null;
  }
}

/** Save a completed exercise session to Supabase. */
export async function saveSession(data: SaveSessionInput): Promise<boolean> {

  try {
    // Block local (offline) users from writing to Supabase
    const currentUser = getState().user;
    if (currentUser?.isLocalUser || currentUser?.id?.startsWith('local_')) {
      console.warn('[PhysioBuddy] ⚠️ BLOCKED: Local user cannot write to Supabase');
      return false;
    }

    const userId = await getAuthUserId();
    if (!userId) {
      console.error('[PhysioBuddy] BLOCKED: Cannot save to Supabase — no authenticated user');
      return false;
    }

    const insertPayload = {
      user_id: userId,
      exercise_type: data.exerciseType,
      exercise_name: data.exerciseName,
      reps: data.reps,
      accuracy: data.accuracy,
      incorrect_reps: data.incorrectReps,
      duration: data.duration,
      calories: data.calories,
    };



    const { data: result, error } = await supabase
      .from('sessions')
      .insert(insertPayload)
      .select();



    if (error) {
      console.error('[PhysioBuddy] saveSession error:', error.message, error.details, error.hint);
      return false;
    }

    console.log('[PhysioBuddy] ✅ Session saved to Supabase successfully!');
    return true;
  } catch (err) {
    console.error('[PhysioBuddy] saveSession network error:', err);
    return false;
  }
}

/** Fetch all sessions for the current user. */
export async function getUserSessions(): Promise<SessionRow[]> {
  try {
    const userId = await getAuthUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[PhysioBuddy] getUserSessions error:', error.message);
      return [];
    }

    console.log(`[PhysioBuddy] Fetched ${data?.length ?? 0} sessions from Supabase`);
    return (data as SessionRow[]) ?? [];
  } catch {
    return [];
  }
}

/** Calculate aggregate stats from the user's sessions. */
export async function getUserStats() {
  const sessions = await getUserSessions();

  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalReps: 0,
      bestAccuracy: 0,
      avgAccuracy: 0,
      totalDuration: 0,
      streak: 0,
      improvement: 0,
    };
  }

  const totalReps = sessions.reduce((s, r) => s + r.reps, 0);
  const bestAccuracy = Math.max(...sessions.map((r) => r.accuracy));
  const avgAccuracy = Math.round(
    sessions.reduce((s, r) => s + r.accuracy, 0) / sessions.length,
  );
  const totalDuration = sessions.reduce((s, r) => s + r.duration, 0);

  // Streak: consecutive days with at least one session
  const daySet = new Set(
    sessions.map((s) => new Date(s.created_at).toDateString()),
  );
  let streak = 0;
  const day = new Date();
  while (daySet.has(day.toDateString())) {
    streak++;
    day.setDate(day.getDate() - 1);
  }

  // Improvement: compare last 5 sessions avg accuracy to first 5
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const first5 = sorted.slice(0, 5);
  const last5 = sorted.slice(-5);
  const first5Avg = first5.reduce((s, r) => s + r.accuracy, 0) / first5.length;
  const last5Avg = last5.reduce((s, r) => s + r.accuracy, 0) / last5.length;
  const improvement = Math.round(last5Avg - first5Avg);

  return {
    totalSessions: sessions.length,
    totalReps,
    bestAccuracy,
    avgAccuracy,
    totalDuration,
    streak,
    improvement,
  };
}
