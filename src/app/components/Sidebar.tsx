import { Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Search,
  FileText,
  ScanLine,
  Play,
  Video,
  BarChart3,
  User,
  Mail,
} from "lucide-react";
import { Card } from "./design-system/Card";
import { useUser } from "../../context/UserContext";

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
  const { user } = useUser();

  return (
    <div className="w-64 h-[calc(100vh-4rem)] bg-white border-r border-border p-4 flex flex-col">

      {/* Navigation */}
      <nav className="space-y-2 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <Card variant="gradient" padding="sm" className="border-2 border-primary/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
            <User className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">
              {user?.name || "User"}
            </h3>
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {user?.email || "user@example.com"}
            </p>
          </div>
        </div>
      </Card>

    </div>
  );
}