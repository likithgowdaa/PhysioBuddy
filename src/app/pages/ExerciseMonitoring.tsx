import { useState, useEffect, useCallback, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Check,
  AlertTriangle,
  Camera,
  Volume2,
  X,
  Activity,
  Target,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "../components/design-system/Button";
import { Card } from "../components/design-system/Card";
import { Alert } from "../components/design-system/Alert";
import { StatCard } from "../components/design-system/StatCard";
import CameraComponent from "../components/Camera";
import { getState, setState, getExerciseInfo, estimateCalories } from "../../utils/store";
import type { ExerciseData } from "../../hooks/useExerciseLogic";
import { saveSession } from "../../services/sessionService";
import { resumeAudioContext, playBeep } from "../../utils/audioUtils";

type FeedbackType = {
  message: string;
  type: "correct" | "warning" | "error";
};

type SessionState = "idle" | "loading" | "positioned" | "running" | "paused" | "completed";

export function ExerciseMonitoring() {
  const navigate = useNavigate();

  // Read selected exercise from store
  const selectedExercise = getState().selectedExercise;
  const exerciseInfo = getExerciseInfo(selectedExercise);

  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [isRunning, setIsRunning] = useState(false);
  const [reps, setReps] = useState(0);
  const [accuracy, setAccuracy] = useState(60);
  const [angle, setAngle] = useState(0);
  const [status, setStatus] = useState<"correct" | "incorrect">("correct");
  const [feedback, setFeedback] = useState<FeedbackType | null>(null);
  const [timer, setTimer] = useState(0);
  const [bodyInFrame, setBodyInFrame] = useState(false);

  // Live refs — always hold latest values (immune to stale React state)
  const liveRepsRef = useRef(0);
  const liveTimerRef = useRef(0);
  const liveAccuracyRef = useRef(60);

  // Track incorrect reps for session report
  const incorrectRepsRef = useRef(0);
  const lastRepCountRef = useRef(0);

  // Camera loading → positioned → idle
  useEffect(() => {
    const loadTimer = setTimeout(() => {
      setSessionState("positioned");
      setTimeout(() => {
        setBodyInFrame(true);
        setSessionState("idle");
      }, 1500);
    }, 2000);
    return () => clearTimeout(loadTimer);
  }, []);

  // Timer — counts up every second while running
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning && bodyInFrame) {
      interval = setInterval(() => {
        setTimer((prev) => {
          const next = prev + 1;
          liveTimerRef.current = next;
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, bodyInFrame]);

  // Handle real-time exercise data from Camera's AI pose detection
  const handleExerciseUpdate = useCallback((data: ExerciseData) => {
    if (!data.bodyDetected) {
      setBodyInFrame(false);
      return;
    }
    setBodyInFrame(true);
    setReps(data.reps);
    setAccuracy(data.accuracy);
    setAngle(data.angle);
    liveRepsRef.current = data.reps;
    liveAccuracyRef.current = data.accuracy;

    // Track incorrect reps
    if (data.reps > lastRepCountRef.current) {
      if (data.feedback.type !== 'correct') {
        incorrectRepsRef.current++;
      }
      lastRepCountRef.current = data.reps;
    }

    if (data.feedback.type === 'correct') {
      setStatus('correct');
      setFeedback({ message: data.feedback.message, type: 'correct' });
    } else {
      setStatus('incorrect');
      setFeedback({
        message: data.feedback.message,
        type: data.feedback.type === 'error' ? 'error' : 'warning',
      });
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleFinish = async () => {
    setIsRunning(false);
    setSessionState("completed");

    // Use live refs — immune to stale React state
    const finalReps = liveRepsRef.current;
    const finalDuration = liveTimerRef.current;
    const finalAccuracy = Math.max(60, liveAccuracyRef.current);

    // Block save if no reps were completed or session is invalid
    if (finalReps === 0 || finalDuration === 0) {
      console.warn('[PhysioBuddy] Session invalid — reps:', finalReps, 'timer:', finalDuration, '— skipping save');
      setTimeout(() => navigate("/session-report"), 500);
      return;
    }

    // Save session data to store for SessionReport page
    const calories = estimateCalories(selectedExercise, finalDuration);

    console.log('SAVING ACCURACY:', finalAccuracy, '| reps:', finalReps, '| duration:', finalDuration);

    const sessionData = {
      exerciseType: selectedExercise,
      exerciseName: exerciseInfo.name,
      reps: finalReps,
      accuracy: finalAccuracy,
      incorrectReps: incorrectRepsRef.current,
      duration: finalDuration,
      calories,
    };

    setState({ currentSession: sessionData });
    localStorage.setItem('physioBuddyLatestSession', JSON.stringify(sessionData));

    // Save to Supabase
    try {
      await saveSession(sessionData);
    } catch (err) {
      console.error('[PhysioBuddy] Supabase save failed:', err);
    }

    setTimeout(() => navigate("/session-report"), 500);
  };

  const handleStart = () => {
    resumeAudioContext(); // Unlock audio after user gesture

    // Force a test beep within user gesture to fully satisfy browser audio policy
    try {
      playBeep(1200);
    } catch { /* ignore */ }

    setIsRunning(true);
    setSessionState("running");
  };

  const handlePause = () => {
    setIsRunning(false);
    setSessionState("paused");
  };

  const handleReset = () => {
    setReps(0);
    setAccuracy(100);
    setTimer(0);
    setFeedback(null);
    setStatus("correct");
    setIsRunning(false);
    setSessionState("idle");
    incorrectRepsRef.current = 0;
    lastRepCountRef.current = 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold mb-1">Live Exercise Session</h1>
            <p className="text-muted-foreground text-sm">{exerciseInfo.name}</p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Full Width Camera View */}
        <div className="mb-4">
          <div className="bg-white rounded-2xl border-2 border-border overflow-hidden shadow-xl">
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Camera className="w-5 h-5" />
                <span className="font-semibold">Your Live Posture</span>
              </div>
              <div className="flex items-center gap-3">
                {isRunning && bodyInFrame && (
                  <div className="flex items-center gap-2 text-white">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium">AI MONITORING</span>
                  </div>
                )}
                <div className="bg-white/20 px-3 py-1 rounded-full text-white text-xs font-medium">
                  Mirror View
                </div>
              </div>
            </div>

            <div className="relative aspect-video bg-gradient-to-br from-slate-800 to-slate-900">
              {/* Camera Loading State */}
              {sessionState === "loading" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900">
                  <div className="relative mb-6">
                    <div className="w-24 h-24 border-4 border-primary/20 rounded-full absolute animate-ping" />
                    <div className="w-24 h-24 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <Camera className="w-12 h-12 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <h3 className="text-white text-xl font-semibold mb-2">Initializing Camera</h3>
                  <p className="text-white/70 text-sm mb-4">Please allow camera access</p>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}

              {/* Camera Feed (Mirrored) */}
              {sessionState !== "loading" && (
                <>
                  <div className="absolute inset-0">
                    <CameraComponent
                      exerciseType={selectedExercise}
                      onExerciseUpdate={handleExerciseUpdate}
                      onResults={() => { }}
                      isRunning={isRunning}
                      onSessionComplete={handleFinish}
                    />
                  </div>

                  {/* Positioning Guide */}
                  {sessionState === "positioned" && !bodyInFrame && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                      <div className="text-center text-white p-8 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl max-w-md mx-4">
                        <div className="relative w-20 h-20 mx-auto mb-6">
                          <div className="w-20 h-20 border-4 border-dashed border-white/50 rounded-2xl absolute animate-pulse" />
                          <div className="w-16 h-16 border-4 border-white rounded-xl absolute top-2 left-2" />
                        </div>
                        <h3 className="text-2xl font-bold mb-3">Position Yourself</h3>
                        <p className="text-sm mb-4 text-white/90">
                          Stand 6-8 feet away and ensure your full body is visible in the frame
                        </p>
                        <div className="flex items-center justify-center gap-2 text-yellow-300 bg-yellow-500/20 px-4 py-2 rounded-full">
                          <AlertTriangle className="w-5 h-5 animate-pulse" />
                          <span className="text-sm font-medium">Detecting body position...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI Tracking Overlay */}
                  {bodyInFrame && (
                    <>
                      {/* Body Detection Badge */}
                      <div className="absolute top-4 left-4 z-10 bg-green-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 animate-in fade-in duration-500">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        Body Detected ✓
                      </div>

                      {/* Real-time Accuracy Badge */}
                      <div className={`absolute top-4 right-4 z-10 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-semibold animate-in fade-in duration-500 ${accuracy >= 85 ? 'bg-green-500/90' : accuracy >= 60 ? 'bg-yellow-500/90' : 'bg-red-500/90'
                        }`}>
                        {accuracy}% Accuracy
                      </div>

                      {/* Current Angle Display */}
                      <div className="absolute bottom-4 left-4 z-10 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-mono">
                        Angle: {typeof angle === 'number' ? angle.toFixed(0) : 0}°
                      </div>

                      {/* Status Glow Border */}
                      <div className={`absolute inset-0 pointer-events-none transition-all duration-300 ${status === "correct"
                        ? "border-2 border-green-500/60 shadow-[inset_0_0_30px_rgba(34,197,94,0.15)]"
                        : "border-2 border-red-500/60 shadow-[inset_0_0_30px_rgba(239,68,68,0.15)]"
                        }`} />
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Stats Bar with Glass Effect */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <StatCard
            value={reps}
            label="Reps"
            icon={<Target className="w-8 h-8" />}
            variant="primary"
          />

          <StatCard
            value={`${accuracy}%`}
            label="Accuracy"
            icon={<Activity className="w-8 h-8" />}
            variant={accuracy >= 85 ? "success" : accuracy >= 70 ? "warning" : "error"}
          />

          <StatCard
            value=""
            label={status === "correct" ? "Perfect Form" : "Adjust Form"}
            icon={
              status === "correct" ? (
                <Check className="w-8 h-8" />
              ) : (
                <AlertTriangle className="w-8 h-8" />
              )
            }
            variant={status === "correct" ? "success" : "error"}
          />

          <StatCard
            value={formatTime(timer)}
            label="Duration"
            icon={<Clock className="w-8 h-8" />}
            variant="default"
          />
        </div>

        {/* Enhanced Real-time Feedback with Design System */}
        {isRunning && feedback && (
          <Alert
            type={feedback.type === "correct" ? "success" : "warning"}
            title={feedback.type === "correct" ? "Perfect Form!" : "Adjust Your Posture"}
            animated
            className="mb-4"
          >
            <div className="flex items-center justify-between">
              <span>{feedback.message}</span>
              {feedback.type !== "correct" && (
                <Volume2 className="w-5 h-5 text-warning animate-pulse ml-2" />
              )}
            </div>
          </Alert>
        )}

        {/* Idle State Helper */}
        {sessionState === "idle" && !isRunning && (
          <Alert type="info" title="Ready to Start" className="mb-4">
            Position yourself correctly and click "Start Exercise" when ready
          </Alert>
        )}

        {/* Enhanced Control Buttons with Design System */}
        <div className="flex flex-wrap gap-3 justify-center">
          {sessionState === "loading" || sessionState === "positioned" ? (
            <Button size="lg" disabled>
              <Camera className="w-6 h-6" />
              Initializing...
            </Button>
          ) : !isRunning ? (
            <Button
              size="lg"
              variant="success"
              onClick={handleStart}
              disabled={!bodyInFrame}
              icon={<Play className="w-6 h-6" />}
            >
              Start Exercise
            </Button>
          ) : (
            <>
              <Button
                size="md"
                variant="warning"
                onClick={handlePause}
                icon={<Pause className="w-5 h-5" />}
              >
                Pause
              </Button>
              <Button
                size="md"
                variant="primary"
                onClick={handleFinish}
                icon={<Check className="w-5 h-5" />}
              >
                Finish Session
              </Button>
            </>
          )}
          <Button
            size="md"
            variant="outline"
            onClick={handleReset}
            icon={<RotateCcw className="w-5 h-5" />}
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}