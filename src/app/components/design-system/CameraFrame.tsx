import { forwardRef } from "react";
import { cn } from "../ui/utils";
import { Camera } from "lucide-react";

interface CameraFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  isRecording?: boolean;
  isLoading?: boolean;
  headerColor?: "primary" | "success" | "warning";
  controls?: React.ReactNode;
}

export const CameraFrame = forwardRef<HTMLDivElement, CameraFrameProps>(
  ({
    className,
    title = "Camera Feed",
    isRecording = false,
    isLoading = false,
    headerColor = "success",
    controls,
    children,
    ...props
  }, ref) => {
    const headerColors = {
      primary: "bg-gradient-to-r from-blue-600 to-blue-700",
      success: "bg-gradient-to-r from-green-600 to-green-700",
      warning: "bg-gradient-to-r from-orange-600 to-orange-700",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "bg-white rounded-2xl border-2 border-border overflow-hidden shadow-xl",
          className
        )}
        {...props}
      >
        {/* Header */}
        <div className={cn("px-4 py-3 flex items-center justify-between", headerColors[headerColor])}>
          <div className="flex items-center gap-2 text-white">
            <Camera className="w-5 h-5" />
            <span className="font-semibold">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            {isRecording && (
              <div className="flex items-center gap-2 text-white">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">RECORDING</span>
              </div>
            )}
            {controls}
          </div>
        </div>

        {/* Content Area */}
        <div className="relative aspect-video lg:aspect-[9/16] bg-gradient-to-br from-slate-800 to-slate-900">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900 z-20">
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
          {children}
        </div>
      </div>
    );
  }
);

CameraFrame.displayName = "CameraFrame";
