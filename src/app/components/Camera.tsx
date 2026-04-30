// Camera.tsx
import { useEffect, useRef } from "react";
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

interface CameraProps {
  onResults?: (results: PoseLandmarkerResult) => void;
  modelAssetPath?: string;
  numPoses?: number;
}

const Camera: React.FC<CameraProps> = ({
  onResults,
  modelAssetPath = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  numPoses = 1,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        // 1. Initialize MediaPipe PoseLandmarker
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );

        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses,
        });

        if (!isMounted) {
          poseLandmarker.close();
          return;
        }

        poseLandmarkerRef.current = poseLandmarker;

        // 2. Start webcam
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => {
            video.play();
            resolve();
          };
        });

        // 3. Match canvas size to video
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        // 4. Start prediction loop
        predictWebcam();
      } catch (err) {
        console.error("Camera/PoseLandmarker init error:", err);
      }
    };

    const predictWebcam = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const poseLandmarker = poseLandmarkerRef.current;

      if (!video || !canvas || !poseLandmarker) {
        animationFrameRef.current = requestAnimationFrame(predictWebcam);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (video.currentTime !== lastVideoTimeRef.current && video.videoWidth > 0) {
        lastVideoTimeRef.current = video.currentTime;

        poseLandmarker.detectForVideo(video, performance.now(), (result) => {
          ctx.save();
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const drawingUtils = new DrawingUtils(ctx);

          for (const landmarks of result.landmarks) {
            // Draw connectors (skeleton bones)
            drawingUtils.drawConnectors(
              landmarks,
              PoseLandmarker.POSE_CONNECTIONS,
              { color: "#00FF00", lineWidth: 4 }
            );
            // Draw landmarks (joints)
            drawingUtils.drawLandmarks(landmarks, {
              color: "#FF0000",
              lineWidth: 2,
              radius: 4,
            });
          }

          ctx.restore();

          if (onResults) onResults(result);
        });
      }

      animationFrameRef.current = requestAnimationFrame(predictWebcam);
    };

    initialize();

    // Cleanup
    return () => {
      isMounted = false;

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
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
    <div style={{ position: "relative" }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ position: "absolute", top: 0, left: 0 }}
      />
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", top: 0, left: 0 }}
      />
    </div>
  );
};

export default Camera;