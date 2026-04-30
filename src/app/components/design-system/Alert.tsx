import { forwardRef } from "react";
import { cn } from "../ui/utils";
import { Check, AlertTriangle, Info, XCircle } from "lucide-react";

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "success" | "warning" | "error" | "info";
  title?: string;
  icon?: React.ReactNode;
  animated?: boolean;
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, type = "info", title, icon, animated = false, children, ...props }, ref) => {
    const typeConfig = {
      success: {
        bg: "bg-success-light",
        border: "border-success",
        icon: <Check className="w-6 h-6 text-success" />,
        iconBg: "bg-success",
        text: "text-success-foreground",
      },
      warning: {
        bg: "bg-warning-light",
        border: "border-warning",
        icon: <AlertTriangle className="w-6 h-6 text-warning" />,
        iconBg: "bg-warning",
        text: "text-warning-foreground",
      },
      error: {
        bg: "bg-error-light",
        border: "border-error",
        icon: <XCircle className="w-6 h-6 text-error" />,
        iconBg: "bg-error",
        text: "text-error-foreground",
      },
      info: {
        bg: "bg-blue-50",
        border: "border-blue-500",
        icon: <Info className="w-6 h-6 text-blue-600" />,
        iconBg: "bg-blue-500",
        text: "text-white",
      },
    };

    const config = typeConfig[type];

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl p-4 border-2 flex items-start gap-3",
          config.bg,
          config.border,
          animated && "animate-in slide-in-from-top-2 duration-300",
          className
        )}
        {...props}
      >
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", config.iconBg)}>
          {icon || config.icon}
        </div>
        <div className="flex-1">
          {title && <h3 className="font-semibold mb-0.5">{title}</h3>}
          {children && <p className="text-sm">{children}</p>}
        </div>
      </div>
    );
  }
);

Alert.displayName = "Alert";
