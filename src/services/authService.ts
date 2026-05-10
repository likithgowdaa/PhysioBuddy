// ============================================================
// authService.ts — Supabase Authentication Service
// ============================================================

import { supabase } from '../lib/supabase';

// ----- Helpers -----

/**
 * Detect network / connectivity errors vs. Supabase API errors.
 * Only returns true for genuine network failures (fetch failed, DNS, timeout).
 */
export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError && /fetch|network/i.test(err.message)) return true;
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  if (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
  ) {
    const msg = (err as { message: string }).message.toLowerCase();
    if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('timeout')) {
      return true;
    }
  }
  return false;
}

// ----- Auth Result Type -----

export interface AuthResult {
  error: string | null;
}

// ----- Sign Up -----

/** Sign up with email + password. Verifies user via getUser() after creation. */
export async function signUp(
  email: string,
  password: string,
): Promise<AuthResult> {
  try {
    console.log('[PhysioBuddy] Supabase signUp attempt:', email);

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      console.error('[PhysioBuddy] Supabase signUp error:', error.message);
      return { error: error.message };
    }

    if (!data.user) {
      console.error('[PhysioBuddy] Supabase signUp returned no user');
      return { error: 'Sign-up failed. Please try again.' };
    }

    // Verify the user was actually created by checking with the server
    const { data: verifiedData, error: verifyError } = await supabase.auth.getUser();
    console.log('[PhysioBuddy] signUp getUser() result:', {
      user: verifiedData?.user?.id ?? null,
      error: verifyError?.message ?? null,
    });

    if (verifyError || !verifiedData?.user) {
      console.warn('[PhysioBuddy] signUp succeeded but getUser() verification failed — user may need email confirmation');
      // Still return success — Supabase may require email confirmation before getUser() works
    }

    console.log('[PhysioBuddy] ✅ signUp success:', data.user.id);
    return { error: null };
  } catch (err) {
    console.error('[PhysioBuddy] Supabase signUp exception:', err);
    if (isNetworkError(err)) {
      return { error: '__NETWORK_ERROR__' };
    }
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}

// ----- Login (CRITICAL FIX) -----

/**
 * Log in with email + password.
 * ALWAYS verifies via getUser() after signInWithPassword.
 * If getUser() returns null → login is REJECTED (no fallback).
 */
export async function login(
  email: string,
  password: string,
): Promise<AuthResult> {
  try {
    console.log('[PhysioBuddy] Supabase login attempt:', email);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error('[PhysioBuddy] Supabase login error:', error.message);
      return { error: error.message };
    }

    if (!data.user || !data.session) {
      console.error('[PhysioBuddy] Supabase login returned no user/session');
      return { error: 'Login failed. Please try again.' };
    }

    // CRITICAL: Always verify via getUser() — this is server-verified
    const { data: verifiedData, error: verifyError } = await supabase.auth.getUser();

    console.log('[PhysioBuddy] login getUser() result:', {
      user: verifiedData?.user?.id ?? null,
      email: verifiedData?.user?.email ?? null,
      error: verifyError?.message ?? null,
    });

    // STRICT: If getUser() fails, reject the login entirely
    if (verifyError || !verifiedData?.user) {
      console.error('[PhysioBuddy] ❌ login REJECTED — getUser() returned null after signInWithPassword');
      // Sign out the unverified session
      await supabase.auth.signOut();
      return { error: 'Login verification failed. Please try again.' };
    }

    console.log('[PhysioBuddy] ✅ login verified:', verifiedData.user.id);
    return { error: null };
  } catch (err) {
    console.error('[PhysioBuddy] Supabase login exception:', err);
    if (isNetworkError(err)) {
      return { error: '__NETWORK_ERROR__' };
    }
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}

// ----- Logout -----

/** Log out the current user. */
export async function logout(): Promise<void> {
  try {
    await supabase.auth.signOut();
    console.log('[PhysioBuddy] Supabase signOut complete');
  } catch (err) {
    console.error('[PhysioBuddy] Supabase logout error:', err);
  }
}

// ----- Get Current User -----

/** Get the currently authenticated user (server-verified). */
export async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

// ----- Forgot Password (Email Link Only) -----

/**
 * Send a password reset email with a link to /reset-password.
 * Does NOT use OTP. The link contains a token that Supabase uses
 * to establish a PASSWORD_RECOVERY session on redirect.
 */
export async function forgotPassword(email: string): Promise<AuthResult> {
  try {
    console.log('[PhysioBuddy] Supabase forgotPassword attempt:', email);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      console.error('[PhysioBuddy] Supabase forgotPassword error:', error.message);
      return { error: error.message };
    }

    console.log('[PhysioBuddy] ✅ Password reset email sent to:', email);
    return { error: null };
  } catch (err) {
    console.error('[PhysioBuddy] forgotPassword exception:', err);
    if (isNetworkError(err)) {
      return { error: 'Network error. Please check your connection.' };
    }
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}

// ----- Reset Password -----

/**
 * Update the user's password. Called on /reset-password page after
 * the user clicks the email link (which establishes a recovery session).
 */
export async function resetPassword(newPassword: string): Promise<AuthResult> {
  try {
    if (newPassword.length < 6) {
      return { error: 'Password must be at least 6 characters.' };
    }

    console.log('[PhysioBuddy] Supabase resetPassword attempt');

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      console.error('[PhysioBuddy] Supabase resetPassword error:', error.message);
      return { error: error.message };
    }

    console.log('[PhysioBuddy] ✅ Password updated successfully');
    return { error: null };
  } catch (err) {
    console.error('[PhysioBuddy] resetPassword exception:', err);
    if (isNetworkError(err)) {
      return { error: 'Network error. Please check your connection.' };
    }
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}

// ----- OTP Login (Separate Flow) -----

/**
 * Sign in with a magic-link OTP sent to the user's email.
 * This is separate from password login and does NOT interfere with it.
 * On redirect, the session restores automatically via onAuthStateChange.
 */
export async function signInWithOtp(email: string): Promise<AuthResult> {
  try {
    console.log('[PhysioBuddy] Supabase OTP login attempt:', email);

    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      console.error('[PhysioBuddy] Supabase OTP login error:', error.message);
      return { error: error.message };
    }

    console.log('[PhysioBuddy] ✅ OTP email sent to:', email);
    return { error: null };
  } catch (err) {
    console.error('[PhysioBuddy] OTP login exception:', err);
    if (isNetworkError(err)) {
      return { error: 'Network error. Please check your connection.' };
    }
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}

// ----- Auth State Change Listener -----

export type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'PASSWORD_RECOVERY' | string;

/** Listen for auth state changes. Returns an unsubscribe function. */
export function onAuthChange(
  callback: (
    event: AuthEvent,
    user: { id: string; email: string } | null,
  ) => void,
) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    console.log('[PhysioBuddy] onAuthStateChange event:', event, 'user:', session?.user?.email ?? null);

    if (session?.user) {
      callback(event, { id: session.user.id, email: session.user.email ?? '' });
    } else {
      callback(event, null);
    }
  });
  return () => data.subscription.unsubscribe();
}
