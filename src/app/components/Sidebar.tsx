import { Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Search,
  FileText,
  ScanLine,
  Play,
  Video,
  BarChart3,
  FileBarChart,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Search, label: "Exercise Search", path: "/exercise-search" },
  { icon: FileText, label: "Upload Prescription", path: "/prescription-upload" },
  { icon: ScanLine, label: "Upload X-Ray", path: "/xray-upload" },
  { icon: Video, label: "Demo Video", path: "/demo-video" },
  { icon: Play, label: "Start Exercise", path: "/exercise-monitoring" },
  { icon: BarChart3, label: "Progress", path: "/progress" },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-64 h-[calc(100vh-4rem)] bg-white border-r border-border p-4">
      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}