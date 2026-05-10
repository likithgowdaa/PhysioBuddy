import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, Award, Calendar, Target, ChevronDown } from "lucide-react";
import { getState, getWeekSessions, getMonthSessions, getStreak, type SessionRecord } from "../../utils/store";
import { getUserSessions, getUserStats } from "../../services/sessionService";

export function ProgressDashboard() {
  const [timeRange, setTimeRange] = useState<"week" | "month">("week");
  const [remoteSessions, setRemoteSessions] = useState<SessionRecord[]>([]);
  const [supabaseStats, setSupabaseStats] = useState<{
    totalSessions: number;
    bestAccuracy: number;
    streak: number;
    improvement: number;
  } | null>(null);

  // Fetch Supabase sessions + stats on mount
  useEffect(() => {
    // Fetch aggregate stats
    getUserStats().then((stats) => {
      if (stats.totalSessions > 0) {
        setSupabaseStats(stats);
      }
    }).catch(() => {});

    // Fetch individual sessions for chart data
    getUserSessions().then((rows) => {
      if (rows.length > 0) {
        // Map Supabase rows to local SessionRecord shape
        const mapped: SessionRecord[] = rows.map((r) => ({
          id: r.id,
          exerciseType: r.exercise_type as SessionRecord['exerciseType'],
          exerciseName: r.exercise_name,
          reps: r.reps,
          accuracy: r.accuracy,
          incorrectReps: r.incorrect_reps,
          duration: r.duration,
          calories: r.calories,
          date: r.created_at,
        }));
        setRemoteSessions(mapped);
      }
    }).catch(() => {});
  }, []);

  const localSessions = getState().sessions;

  // Merge: prefer Supabase sessions when available, deduplicate by id
  const allSessions = (() => {
    if (remoteSessions.length === 0) return localSessions;
    const idSet = new Set(remoteSessions.map((s) => s.id));
    const uniqueLocal = localSessions.filter((s) => !idSet.has(s.id));
    return [...remoteSessions, ...uniqueLocal];
  })();

  // Filter week/month from merged set
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const weekSessions = allSessions.filter(
    (s) => new Date(s.date).getTime() >= weekAgo,
  );
  const monthSessions = allSessions.filter(
    (s) => new Date(s.date).getTime() >= monthAgo,
  );

  // Use Supabase stats if available, otherwise compute from merged set
  const bestAccuracy = supabaseStats
    ? supabaseStats.bestAccuracy
    : allSessions.length > 0
      ? Math.max(...allSessions.map((s) => s.accuracy))
      : 0;
  const totalExercises = supabaseStats
    ? supabaseStats.totalSessions
    : allSessions.length;

  // Streak from merged data
  const streak = (() => {
    if (supabaseStats && supabaseStats.streak > 0) return supabaseStats.streak;
    const daySet = new Set(allSessions.map((s) => new Date(s.date).toDateString()));
    let s = 0;
    const d = new Date();
    while (daySet.has(d.toDateString())) { s++; d.setDate(d.getDate() - 1); }
    return s;
  })();

  // Improvement
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const lastWeekSessions = allSessions.filter(
    (s) => {
      const t = new Date(s.date).getTime();
      return t >= twoWeeksAgo && t < oneWeekAgo;
    }
  );
  const thisWeekAvg = weekSessions.length > 0
    ? weekSessions.reduce((s, x) => s + x.accuracy, 0) / weekSessions.length
    : 0;
  const lastWeekAvg = lastWeekSessions.length > 0
    ? lastWeekSessions.reduce((s, x) => s + x.accuracy, 0) / lastWeekSessions.length
    : 0;
  const improvement = supabaseStats
    ? supabaseStats.improvement
    : lastWeekAvg > 0
      ? Math.round(((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100)
      : weekSessions.length > 0 ? 100 : 0;

  // Weekly chart data — group by day of week
  const buildWeeklyData = () => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days.map((day, i) => {
      const daySessions = weekSessions.filter((s) => {
        const d = new Date(s.date).getDay();
        // JS: 0=Sun, 1=Mon, etc. We want Mon=0
        const mapped = d === 0 ? 6 : d - 1;
        return mapped === i;
      });
      const accuracy = daySessions.length > 0
        ? Math.round(daySessions.reduce((sum, s) => sum + s.accuracy, 0) / daySessions.length)
        : 0;
      return { day, accuracy, exercises: daySessions.length };
    });
  };

  // Monthly chart data — group by week
  const buildMonthlyData = () => {
    const weeks = ["Week 1", "Week 2", "Week 3", "Week 4"];
    const now = Date.now();
    return weeks.map((label, i) => {
      const weekStart = now - (4 - i) * 7 * 24 * 60 * 60 * 1000;
      const weekEnd = now - (3 - i) * 7 * 24 * 60 * 60 * 1000;
      const wSessions = monthSessions.filter((s) => {
        const t = new Date(s.date).getTime();
        return t >= weekStart && t < weekEnd;
      });
      const accuracy = wSessions.length > 0
        ? Math.round(wSessions.reduce((sum, s) => sum + s.accuracy, 0) / wSessions.length)
        : 0;
      return { week: label, accuracy, exercises: wSessions.length };
    });
  };

  const chartData = timeRange === "week" ? buildWeeklyData() : buildMonthlyData();

  // Exercise distribution — count by category
  const buildDistribution = () => {
    const catMap: Record<string, number> = {};
    for (const s of allSessions) {
      // Map exercise type to category
      const upper = ['elbow_flexion', 'shoulder_abduction', 'shoulder_abduction_stretch', 'shoulder_flexion', 'shoulder_internal_external_rotation', 'arm_raise_rehab'];
      const lower = ['knee_rotation', 'straight_leg_raise', 'sit_to_stand', 'squat', 'single_leg_stand', 'heel_raises', 'toe_raises'];
      const posture = ['back_straightening', 'neck_alignment', 'basic_core_activation'];

      let cat = 'Other';
      if (upper.includes(s.exerciseType)) cat = 'Upper Body';
      else if (lower.includes(s.exerciseType)) cat = 'Lower Body';
      else if (posture.includes(s.exerciseType)) cat = 'Posture';

      catMap[cat] = (catMap[cat] || 0) + 1;
    }

    const colors: Record<string, string> = {
      'Upper Body': '#3b82f6',
      'Lower Body': '#10b981',
      'Posture': '#8b5cf6',
      'Other': '#f59e0b',
    };

    return Object.entries(catMap).map(([name, value]) => ({
      name,
      value,
      color: colors[name] || '#6b7280',
    }));
  };

  const exerciseDistribution = buildDistribution();
  // Fallback for empty state
  const displayDistribution = exerciseDistribution.length > 0
    ? exerciseDistribution
    : [
        { name: "Upper Body", value: 0, color: "#3b82f6" },
        { name: "Lower Body", value: 0, color: "#10b981" },
        { name: "Posture", value: 0, color: "#8b5cf6" },
      ];

  // Dynamic achievements
  const achievements = [
    ...(streak >= 7
      ? [{ icon: Award, title: "Week Warrior", description: `${streak} day streak!`, color: "bg-yellow-500" }]
      : [{ icon: Award, title: "Week Warrior", description: `${streak}/7 day streak`, color: "bg-gray-400" }]),
    ...(bestAccuracy >= 95
      ? [{ icon: Target, title: "Perfect Form", description: `Achieved ${bestAccuracy}% accuracy`, color: "bg-green-500" }]
      : [{ icon: Target, title: "Perfect Form", description: `Best: ${bestAccuracy}% (need 95%)`, color: "bg-gray-400" }]),
    ...(improvement > 0
      ? [{ icon: TrendingUp, title: "Rising Star", description: `${improvement}% improvement this week`, color: "bg-blue-500" }]
      : [{ icon: TrendingUp, title: "Rising Star", description: "Keep going for improvement!", color: "bg-gray-400" }]),
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Progress Dashboard</h1>
          <p className="text-muted-foreground">
            Track your improvement and achievement over time
          </p>
        </div>
        <div className="relative">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as "week" | "month")}
            className="appearance-none px-6 py-3 pr-12 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-medium cursor-pointer"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="text-3xl font-semibold mb-1">{bestAccuracy > 0 ? `${bestAccuracy}%` : "—"}</div>
          <div className="text-sm opacity-90">Best Accuracy</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3">
            <Target className="w-6 h-6" />
          </div>
          <div className="text-3xl font-semibold mb-1">{totalExercises}</div>
          <div className="text-sm opacity-90">Total Exercises</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="text-3xl font-semibold mb-1">{streak}</div>
          <div className="text-sm opacity-90">Day Streak</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3">
            <Award className="w-6 h-6" />
          </div>
          <div className="text-3xl font-semibold mb-1">{improvement > 0 ? `+${improvement}%` : "—"}</div>
          <div className="text-sm opacity-90">Improvement</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Accuracy Trend */}
        <div className="bg-white rounded-2xl border border-border p-6">
          <h2 className="text-xl font-semibold mb-6">Accuracy Trend</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey={timeRange === "week" ? "day" : "week"}
                stroke="#64748b"
                style={{ fontSize: "12px" }}
              />
              <YAxis stroke="#64748b" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: "#3b82f6", r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Exercise Count */}
        <div className="bg-white rounded-2xl border border-border p-6">
          <h2 className="text-xl font-semibold mb-6">Exercises Completed</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey={timeRange === "week" ? "day" : "week"}
                stroke="#64748b"
                style={{ fontSize: "12px" }}
              />
              <YAxis stroke="#64748b" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="exercises" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Exercise Distribution and Achievements */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Exercise Distribution */}
        <div className="bg-white rounded-2xl border border-border p-6">
          <h2 className="text-xl font-semibold mb-6">Exercise Distribution</h2>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={displayDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {displayDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {displayDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-white rounded-2xl border border-border p-6">
          <h2 className="text-xl font-semibold mb-6">Achievements</h2>
          <div className="space-y-4">
            {achievements.map((achievement, index) => {
              const Icon = achievement.icon;
              return (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 bg-muted rounded-xl hover:bg-accent transition-colors"
                >
                  <div className={`w-12 h-12 ${achievement.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{achievement.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {achievement.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
