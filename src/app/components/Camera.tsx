// Camera.tsx — PhysioBuddy Camera + PoseLandmarker
// Performance-optimized: setInterval-based detection, isProcessing guard, CPU delegate
import { useEffect, useRef } from "react";
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { useExerciseLogic, type ExerciseData } from "../../hooks/useExerciseLogic";
import type { ExerciseType } from "../../utils/poseUtils";

interface CameraProps {
  onResults?: (results: PoseLandmarkerResult) => void;
  modelAssetPath?: string;
  numPoses?: number;
  exerciseType?: ExerciseType;
  onExerciseUpdate?: (data: ExerciseData) => void;
  isRunning?: boolean;
  onSessionComplete?: () => void;
}

// ~7 FPS — smooth enough for exercise tracking, efficient on mobile
const DETECTION_INTERVAL_MS = 150;

const Camera: React.FC<CameraProps> = ({
  onResults,
  modelAssetPath = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  numPoses = 1,
  exerciseType = 'knee_rotation',
  onExerciseUpdate,
  isRunning = false,
  onSessionComplete,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const streamRef = useRef<MediaStream | null>(null);

  // Cached DrawingUtils — avoid recreating every frame
  const drawingUtilsRef = useRef<DrawingUtils | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // isProcessing guard — prevent overlapping detections on slow devices
  const isProcessingRef = useRef(false);

  // Session control — gate landmark processing until user clicks Start
  const isRunningRef = useRef(false);
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  // Exercise logic
  const {
    reps, stage, feedback, accuracy, angle, bodyDetected, isCalibrated, processLandmarks,
  } = useExerciseLogic(exerciseType, onSessionComplete);

  // Stable refs
  const processLandmarksRef = useRef(processLandmarks);
  processLandmarksRef.current = processLandmarks;
  const onExerciseUpdateRef = useRef(onExerciseUpdate);
  onExerciseUpdateRef.current = onExerciseUpdate;

  // Fire callback when metrics change
  useEffect(() => {
    if (onExerciseUpdateRef.current) {
      onExerciseUpdateRef.current({
        reps, stage, feedback, accuracy, angle, bodyDetected, isCalibrated,
      });
    }
  }, [reps, stage, feedback, accuracy, angle, bodyDetected, isCalibrated]);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        // 1. Initialize MediaPipe — CPU delegate for reliable fast startup
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );

        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath, delegate: "CPU" },
          runningMode: "VIDEO",
          numPoses,
        });

        if (!isMounted) { poseLandmarker.close(); return; }
        poseLandmarkerRef.current = poseLandmarker;

        // 2. Webcam — 640×480 with explicit facingMode for mobile
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 15 },
            facingMode: "user",
          },
          audio: false,
        });

        if (!isMounted) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => { video.play(); resolve(); };
        });

        // 3. Canvas setup — cache context and DrawingUtils
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctxRef.current = canvas.getContext("2d", { willReadFrequently: false });
          if (ctxRef.current) {
            drawingUtilsRef.current = new DrawingUtils(ctxRef.current);
          }
        }

        // 4. Detection loop — setInterval-based, with isProcessing guard
        intervalRef.current = setInterval(() => {
          // Guard: skip if previous detection is still running
          if (isProcessingRef.current) return;

          const v = videoRef.current;
          const c = canvasRef.current;
          const pl = poseLandmarkerRef.current;
          const ctx = ctxRef.current;
          const drawUtils = drawingUtilsRef.current;

          if (!v || !c || !pl || !ctx) return;

          // Skip if video hasn't advanced
          if (v.currentTime === lastVideoTimeRef.current || v.videoWidth === 0) return;

          isProcessingRef.current = true;
          lastVideoTimeRef.current = v.currentTime;

          let result: PoseLandmarkerResult | null = null;
          try {
            result = pl.detectForVideo(v, performance.now());
          } catch {
            // Detection failed — skip frame
          }

          if (result) {
            // Only draw when landmarks are found
            if (result.landmarks.length > 0 && drawUtils) {
              ctx.save();
              ctx.clearRect(0, 0, c.width, c.height);

              // Mirror canvas drawing to match CSS scaleX(-1) on video
              ctx.translate(c.width, 0);
              ctx.scale(-1, 1);

              for (const landmarks of result.landmarks) {
                drawUtils.drawConnectors(
                  landmarks,
                  PoseLandmarker.POSE_CONNECTIONS,
                  { color: "#00FF00", lineWidth: 3 }
                );
                drawUtils.drawLandmarks(landmarks, {
                  color: "#FF0000",
                  lineWidth: 2,
                  radius: 3,
                });
              }

              ctx.restore();
            } else {
              // No landmarks — clear canvas once
              ctx.clearRect(0, 0, c.width, c.height);
            }

            // Process through exercise logic — ONLY when session is running
            if (result.landmarks?.length > 0 && isRunningRef.current) {
              try {
                processLandmarksRef.current(result.landmarks[0]);
              } catch (e) {
                console.error('[PhysioBuddy] Landmark processing error:', e);
              }
            }

            if (onResults) onResults(result);
          }

          isProcessingRef.current = false;
        }, DETECTION_INTERVAL_MS);

      } catch (err) {
        console.error("[PhysioBuddy] Camera/PoseLandmarker init error:", err);
      }
    };

    initialize();

    return () => {
      isMounted = false;

      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
        poseLandmarkerRef.current = null;
      }
    };
  }, [modelAssetPath, numPoses, onResults]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
      />
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
      />
    </div>
  );
};

export default Camera;