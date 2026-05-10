import { useNavigate } from "react-router";
import {
  Play,
  FileText,
  ScanLine,
  TrendingUp,
  Target,
  Award,
  Calendar,
  Sparkles,
} from "lucide-react";
import { Card } from "../components/design-system/Card";
import { StatCard } from "../components/design-system/StatCard";
import { getState, getTodaySessions, getWeekSessions, getExerciseInfo } from "../../utils/store";

export function Dashboard() {
  const navigate = useNavigate();

  // Read real data from store
  const user = getState().user;
  const todaySessions = getTodaySessions();
  const weekSessions = getWeekSessions();
  const allSessions = getState().sessions;

  // Compute real stats
  const todayCompleted = todaySessions.length;
  const avgAccuracy =
    allSessions.length > 0
      ? Math.round(allSessions.reduce((sum, s) => sum + s.accuracy, 0) / allSessions.length)
      : 0;
  const weekTotal = weekSessions.length;

  // Recent activity — last 3 sessions
  const recentActivity = allSessions
    .slice(-3)
    .reverse()
    .map((s) => {
      const date = new Date(s.date);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      let timeStr: string;
      if (diffHours < 1) timeStr = "Just now";
      else if (diffHours < 24) timeStr = `${diffHours} hours ago`;
      else if (diffDays === 1) timeStr = "Yesterday";
      else timeStr = `${diffDays} days ago`;

      return {
        exercise: s.exerciseName,
        time: timeStr,
        accuracy: s.accuracy,
      };
    });

  const quickActions = [
    {
      icon: Play,
      label: "Start Exercise",
      description: "Begin your session",
      color: "bg-blue-500",
      path: "/exercise-search",
    },
    {
      icon: FileText,
      label: "Upload Prescription",
      description: "Add doctor's notes",
      color: "bg-green-500",
      path: "/prescription-upload",
    },
    {
      icon: ScanLine,
      label: "Upload X-Ray",
      description: "AI analysis",
      color: "bg-purple-500",
      path: "/xray-upload",
    },
    {
      icon: TrendingUp,
      label: "View Progress",
      description: "Track improvement",
      color: "bg-orange-500",
      path: "/progress",
    },
  ];

  const stats = [
    {
      icon: Target,
      label: "Today's Activity",
      value: todayCompleted > 0 ? `${todayCompleted}` : "0",
      subtext: "Exercises completed today",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      icon: Award,
      label: "Accuracy",
      value: allSessions.length > 0 ? `${avgAccuracy}%` : "—",
      subtext: "Average accuracy",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      icon: Calendar,
      label: "This Week",
      value: `${weekTotal}`,
      subtext: "Total exercises",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Enhanced Header with Gradient */}
      <Card variant="gradient" className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-semibold">
            Welcome{user ? `, ${user.name}` : " to PhysioBuddy"}
          </h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Continue your journey to recovery with AI-powered guidance
        </p>
      </Card>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card
                variant="elevated"
                className="cursor-pointer hover:-translate-y-1 text-left group"
                onClick={() => navigate(action.path)}
              >
                <div className={`w-14 h-14 ${action.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-semibold mb-1 text-lg">{action.label}</h3>
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Today's Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const variants = ["primary", "success", "warning"] as const;
            return (
              <Card key={stat.label} variant="glass" className="relative overflow-hidden">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 ${stat.bgColor} rounded-xl flex items-center justify-center shadow-md`}>
                    <Icon className={`w-7 h-7 ${stat.color}`} />
                  </div>
                </div>
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground font-medium">{stat.subtext}</div>
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-2xl" />
              </Card>
            );
          })}
        </div>
      </div>

      {/* Enhanced Recent Activity */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <Card variant="elevated" padding="none">
          <div className="divide-y divide-border">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="p-5 sm:p-6 flex items-center justify-between hover:bg-muted/50 transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                      <Play className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-lg">{activity.exercise}</div>
                      <div className="text-sm text-muted-foreground">{activity.time}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-success">{activity.accuracy}%</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Accuracy</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No sessions yet</p>
                <p className="text-sm">Complete your first exercise to see activity here</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}