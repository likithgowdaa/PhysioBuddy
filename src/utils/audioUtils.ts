// ============================================================
// audioUtils.ts — PhysioBuddy Audio & Voice Feedback
// ============================================================

let lastAlertTime = 0;
const THROTTLE_MS = 4000; // Min 4 seconds between alerts

let audioCtx: AudioContext | null = null;
let isSpeaking = false;

// ---- Smart speak deduplication state ----
let lastSmartMessage = '';
let lastSmartTime = 0;
const SMART_COOLDOWN_MS = 2000;

// ---- Position warning deduplication state ----
let lastPositionMessage = '';
let lastPositionTime = 0;
const POSITION_COOLDOWN_MS = 3000;

// ---- Audio-enabled gate: prevents audio before user gesture ----
let audioEnabled = false;

// ---- Message deduplication: prevent repeated alerts for same mistake ----
let lastAlertMessage = '';

/**
 * Ensure the AudioContext is resumed (browsers require user gesture).
 * Also warms up SpeechSynthesis (Chrome requires a user-gesture-triggered speak).
 * Call this once after a user click (e.g. "Start Exercise" button).
 */
export function resumeAudioContext(): void {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    // Play a silent buffer to fully unlock Web Audio on iOS/Safari
    try {
      const buffer = audioCtx.createBuffer(1, 1, 22050);
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start(0);
    } catch {
      // Silent unlock failed — non-critical
    }

    // Warm up SpeechSynthesis — Chrome blocks it until first user-gesture call
    if ('speechSynthesis' in window) {
      try {
        const warmup = new SpeechSynthesisUtterance('');
        warmup.volume = 0;
        window.speechSynthesis.speak(warmup);
      } catch {
        // SpeechSynthesis warmup failed — non-critical
      }
    }

    audioEnabled = true;
    console.log('[PhysioBuddy] Audio system enabled');
  } catch {
    // AudioContext unavailable
  }
}

/** Check if audio is currently enabled (after user gesture). */
export function isAudioEnabled(): boolean {
  return audioEnabled;
}

/**
 * Play a short beep tone using the Web Audio API oscillator.
 * @param freq Frequency in Hz (default 800 = warning, 1200 = success)
 */
export function playBeep(freq = 800): void {
  if (!audioEnabled) return; // Block before user gesture

  try {
    // Re-create AudioContext if it was closed or doesn't exist
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    // Resume if suspended (can happen after tab switch)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

    // Louder beep with clean fade-out
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.2);
  } catch {
    // Beep failed silently
  }
}

/** Play a success beep (higher pitch). */
export function playSuccessBeep(): void {
  playBeep(1200);
}

/**
 * Speak a correction message using the SpeechSynthesis API.
 * Always cancels previous speech before speaking new one.
 */
export function speakCorrection(message: string): void {
  if (!audioEnabled) return; // Block before user gesture

  try {
    if (!('speechSynthesis' in window)) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    isSpeaking = false;

    // Chrome bug: speechSynthesis.speak() silently fails if called
    // immediately after cancel(). A small delay fixes this.
    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        utterance.lang = 'en-US';

        isSpeaking = true;
        utterance.onend = () => { isSpeaking = false; };
        utterance.onerror = () => { isSpeaking = false; };

        window.speechSynthesis.speak(utterance);
      } catch {
        isSpeaking = false;
      }
    }, 50);
  } catch {
    isSpeaking = false;
  }
}

/**
 * Combined alert: beep + voice correction.
 * Throttled to fire at most once every THROTTLE_MS.
 * Deduplicates: skips if the same message was already the last alert.
 */
export function triggerAlert(message: string): void {
  if (!audioEnabled) return; // Block before user gesture

  const now = Date.now();
  if (now - lastAlertTime < THROTTLE_MS) return;

  // Message deduplication: skip if same message as last alert
  if (message === lastAlertMessage && now - lastAlertTime < THROTTLE_MS * 2) return;

  lastAlertTime = now;
  lastAlertMessage = message;

  playBeep(800);
  speakCorrection(message);
}

/**
 * Persistent alert — only fires after the error has been sustained
 * for at least `minFrames` consecutive frames.
 * Only triggers for 'error' severity (major mistakes).
 */
export function triggerPersistentAlert(
  message: string,
  consecutiveErrorFrames: number,
  minFrames = 8,
): void {
  if (!audioEnabled) return; // Block before user gesture
  if (consecutiveErrorFrames < minFrames) return;
  triggerAlert(message);
}

/**
 * Reset the throttle timer (useful when starting a new session).
 */
export function resetAlertThrottle(): void {
  lastAlertTime = 0;
  lastAlertMessage = '';
  isSpeaking = false;
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // ignore
  }
}

/** Disable audio (e.g. when session ends). */
export function disableAudio(): void {
  audioEnabled = false;
  resetAlertThrottle();
}

/**
 * Smart speak — deduplicated voice with 2s cooldown.
 * Prevents the same message from repeating within the cooldown window.
 * Use for rep announcements and form corrections.
 */
export function speakSmart(message: string): void {
  if (!audioEnabled) return;

  const now = Date.now();
  if (message === lastSmartMessage && now - lastSmartTime < SMART_COOLDOWN_MS) return;

  lastSmartMessage = message;
  lastSmartTime = now;
  speakCorrection(message);
}

/**
 * Speak a position/camera validation warning.
 * Separate cooldown from exercise corrections to avoid overlap.
 * Use for pre-exercise body positioning guidance.
 */
export function speakPositionWarning(message: string): void {
  if (!audioEnabled) return;

  const now = Date.now();
  if (message === lastPositionMessage && now - lastPositionTime < POSITION_COOLDOWN_MS) return;
  // Also respect global speaking state
  if (isSpeaking) return;

  lastPositionMessage = message;
  lastPositionTime = now;
  speakCorrection(message);
}
