import { useState, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Check,
  AlertTriangle,
  Camera,
  Video,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
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

type FeedbackType = {
  message: string;
  type: "correct" | "warning" | "error";
};

type SessionState = "idle" | "loading" | "positioned" | "running" | "paused" | "completed";

export function ExerciseMonitoring() {
  const navigate = useNavigate();
  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [isRunning, setIsRunning] = useState(false);
  const [reps, setReps] = useState(0);
  const [accuracy, setAccuracy] = useState(85);
  const [status, setStatus] = useState<"correct" | "incorrect">("correct");
  const [feedback, setFeedback] = useState<FeedbackType | null>(null);
  const [timer, setTimer] = useState(0);
  const [isDemoMinimized, setIsDemoMinimized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [bodyInFrame, setBodyInFrame] = useState(false);

  // Simulate camera loading and positioning
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

  // Exercise simulation
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning && bodyInFrame) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);

        // Simulate rep counting and feedback
        if (Math.random() > 0.65) {
          setReps((prev) => {
            const newReps = prev + 1;
            
            // Random feedback simulation
            const feedbackOptions = [
              { message: "Perfect form! Keep it up!", type: "correct" as const },
              { message: "Straighten your back more", type: "warning" as const },
              { message: "Raise your arm higher", type: "warning" as const },
              { message: "Good! Maintain this position", type: "correct" as const },
              { message: "Bend your knee to 90 degrees", type: "warning" as const },
            ];

            const selectedFeedback = feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)];
            setFeedback(selectedFeedback);
            setStatus(selectedFeedback.type === "correct" ? "correct" : "incorrect");
            
            // Update accuracy
            if (selectedFeedback.type === "correct") {
              setAccuracy((prev) => Math.min(100, prev + 3));
            } else {
              setAccuracy((prev) => Math.max(60, prev - 1));
            }

            return newReps;
          });
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isRunning, bodyInFrame]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleFinish = () => {
    setIsRunning(false);
    setSessionState("completed");
    setTimeout(() => navigate("/session-report"), 500);
  };

  const handleStart = () => {
    setIsRunning(true);
    setSessionState("running");
  };

  const handlePause = () => {
    setIsRunning(false);
    setSessionState("paused");
  };

  const handleReset = () => {
    setReps(0);
    setAccuracy(85);
    setTimer(0);
    setFeedback(null);
    setStatus("correct");
    setIsRunning(false);
    setSessionState("idle");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold mb-1">Live Exercise Session</h1>
            <p className="text-muted-foreground text-sm">Knee Extension Exercise</p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Main Split Screen Layout */}
        <div className={`grid gap-4 mb-4 transition-all ${isDemoMinimized ? 'lg:grid-cols-[300px_1fr]' : 'lg:grid-cols-2'}`}>
          {/* Demo Video Section */}
          <div className={`transition-all ${isDemoMinimized ? 'hidden lg:block' : ''}`}>
            <div className="bg-white rounded-2xl border-2 border-border overflow-hidden shadow-xl h-full">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <Video className="w-5 h-5" />
                  <span className="font-semibold">Demo Video</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setIsDemoMinimized(!isDemoMinimized)}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white"
                  >
                    {isDemoMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div className={`relative bg-slate-900 ${isDemoMinimized ? 'aspect-video' : 'aspect-video lg:aspect-[9/16]'}`}>
                <img
                  src="https://images.unsplash.com/photo-1764314359427-6e685ce5b719?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaHlzaW90aGVyYXB5JTIwZXhlcmNpc2UlMjBtZWRpY2FsfGVufDF8fHx8MTc3NjM1MDMxN3ww&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Exercise Demo"
                  className="w-full h-full object-cover"
                />
                {isRunning && (
                  <div className="absolute top-3 left-3 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-full flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    PLAYING
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Live Camera Feed Section */}
          <div className="relative">
            <div className="bg-white rounded-2xl border-2 border-border overflow-hidden shadow-xl">
              <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <Camera className="w-5 h-5" />
                  <span className="font-semibold">Your Live Posture</span>
                </div>
                {isRunning && bodyInFrame && (
                  <div className="flex items-center gap-2 text-white">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium">RECORDING</span>
                  </div>
                )}
              </div>

              <div className="relative aspect-video lg:aspect-[9/16] bg-gradient-to-br from-slate-800 to-slate-900">
                {/* Enhanced Camera Loading State */}
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
                    <div className="absolute inset-0" style={{ transform: 'scaleX(-1)' }}>
                      <CameraComponent
                        onResults={(results) => {
                          console.log(results.landmarks);
                        }}
                      />
                    </div>

                    {/* Enhanced Positioning Guide with Glass Effect */}
                    {sessionState === "positioned" && !bodyInFrame && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="text-center text-white p-8 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl max-w-md mx-4 animate-in fade-in zoom-in duration-500">
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

                    {/* Skeleton Pose Overlay - AI Tracking Visualization */}
                    {bodyInFrame && (
                      <>
                        {/* Body Detection Box */}
                        <div className="absolute inset-[10%] border-2 border-green-400 rounded-lg pointer-events-none animate-in fade-in duration-500">
                          <div className="absolute -top-8 left-0 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                            Body Detected ✓
                          </div>
                        </div>

                        {/* Skeleton Pose Lines */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none animate-in fade-in duration-700" style={{ transform: 'scaleX(-1)' }}>
                          {/* Head */}
                          <circle cx="50%" cy="20%" r="25" fill="none" stroke="#22c55e" strokeWidth="3" />
                          
                          {/* Spine */}
                          <line x1="50%" y1="23%" x2="50%" y2="50%" stroke="#22c55e" strokeWidth="3" />
                          
                          {/* Shoulders */}
                          <line x1="35%" y1="28%" x2="65%" y2="28%" stroke="#22c55e" strokeWidth="3" />
                          
                          {/* Left Arm */}
                          <line x1="35%" y1="28%" x2="28%" y2="42%" stroke="#22c55e" strokeWidth="3" />
                          <line x1="28%" y1="42%" x2="22%" y2="56%" stroke="#22c55e" strokeWidth="3" />
                          <circle cx="35%" cy="28%" r="6" fill="#22c55e" />
                          <circle cx="28%" cy="42%" r="6" fill="#22c55e" />
                          <circle cx="22%" cy="56%" r="6" fill="#22c55e" />
                          
                          {/* Right Arm */}
                          <line x1="65%" y1="28%" x2="72%" y2="42%" stroke="#22c55e" strokeWidth="3" />
                          <line x1="72%" y1="42%" x2="78%" y2="56%" stroke="#22c55e" strokeWidth="3" />
                          <circle cx="65%" cy="28%" r="6" fill="#22c55e" />
                          <circle cx="72%" cy="42%" r="6" fill="#22c55e" />
                          <circle cx="78%" cy="56%" r="6" fill="#22c55e" />
                          
                          {/* Hips */}
                          <line x1="42%" y1="50%" x2="58%" y2="50%" stroke="#22c55e" strokeWidth="3" />
                          
                          {/* Left Leg */}
                          <line x1="42%" y1="50%" x2="40%" y2="70%" stroke="#22c55e" strokeWidth="3" />
                          <line x1="40%" y1="70%" x2="38%" y2="90%" stroke="#22c55e" strokeWidth="3" />
                          <circle cx="42%" cy="50%" r="6" fill="#22c55e" />
                          <circle cx="40%" cy="70%" r="6" fill="#22c55e" />
                          <circle cx="38%" cy="90%" r="6" fill="#22c55e" />
                          
                          {/* Right Leg */}
                          <line x1="58%" y1="50%" x2="60%" y2="70%" stroke="#22c55e" strokeWidth="3" />
                          <line x1="60%" y1="70%" x2="62%" y2="90%" stroke="#22c55e" strokeWidth="3" />
                          <circle cx="58%" cy="50%" r="6" fill="#22c55e" />
                          <circle cx="60%" cy="70%" r="6" fill="#22c55e" />
                          <circle cx="62%" cy="90%" r="6" fill="#22c55e" />
                          
                          {/* Angle Indicator (Knee) */}
                          {status === "correct" && (
                            <text x="62%" y="72%" fill="#22c55e" fontSize="14" fontWeight="bold">85°</text>
                          )}
                        </svg>

                        {/* Status Border Overlay */}
                        <div className={`absolute inset-0 border-4 pointer-events-none transition-all ${
                          status === "correct" 
                            ? "border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.5)]" 
                            : "border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]"
                        }`} />
                      </>
                    )}

                    {/* Camera Mirror Label */}
                    <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                      Mirror View
                    </div>
                  </>
                )}
              </div>
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