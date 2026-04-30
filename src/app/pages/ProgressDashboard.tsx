import { useState } from "react";
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

const weeklyData = [
  { day: "Mon", accuracy: 82, exercises: 3 },
  { day: "Tue", accuracy: 85, exercises: 4 },
  { day: "Wed", accuracy: 88, exercises: 3 },
  { day: "Thu", accuracy: 90, exercises: 5 },
  { day: "Fri", accuracy: 87, exercises: 4 },
  { day: "Sat", accuracy: 92, exercises: 6 },
  { day: "Sun", accuracy: 89, exercises: 3 },
];

const monthlyData = [
  { week: "Week 1", accuracy: 75, exercises: 12 },
  { week: "Week 2", accuracy: 82, exercises: 15 },
  { week: "Week 3", accuracy: 87, exercises: 18 },
  { week: "Week 4", accuracy: 90, exercises: 20 },
];

const exerciseDistribution = [
  { name: "Knee", value: 45, color: "#3b82f6" },
  { name: "Shoulder", value: 30, color: "#10b981" },
  { name: "Back", value: 25, color: "#8b5cf6" },
];

export function ProgressDashboard() {
  const [timeRange, setTimeRange] = useState<"week" | "month">("week");

  const chartData = timeRange === "week" ? weeklyData : monthlyData;

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
          <div className="text-3xl font-semibold mb-1">92%</div>
          <div className="text-sm opacity-90">Best Accuracy</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3">
            <Target className="w-6 h-6" />
          </div>
          <div className="text-3xl font-semibold mb-1">28</div>
          <div className="text-sm opacity-90">Total Exercises</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="text-3xl font-semibold mb-1">7</div>
          <div className="text-sm opacity-90">Day Streak</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3">
            <Award className="w-6 h-6" />
          </div>
          <div className="text-3xl font-semibold mb-1">+15%</div>
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
                  data={exerciseDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {exerciseDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {exerciseDistribution.map((item) => (
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
          <h2 className="text-xl font-semibold mb-6">Recent Achievements</h2>
          <div className="space-y-4">
            {[
              {
                icon: Award,
                title: "Week Warrior",
                description: "Completed 7 days in a row",
                color: "bg-yellow-500",
              },
              {
                icon: Target,
                title: "Perfect Form",
                description: "Achieved 95% accuracy",
                color: "bg-green-500",
              },
              {
                icon: TrendingUp,
                title: "Rising Star",
                description: "15% improvement this week",
                color: "bg-blue-500",
              },
            ].map((achievement, index) => {
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
