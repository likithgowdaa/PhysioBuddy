import { useNavigate } from "react-router";
import { CheckCircle, TrendingUp, Clock, Target, Award, Share2, Download } from "lucide-react";

export function SessionReport() {
  const navigate = useNavigate();

  const sessionData = {
    totalReps: 15,
    incorrectPosture: 3,
    accuracy: 87,
    duration: "12:34",
    exercise: "Knee Extension",
    calories: 45,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-3xl font-semibold mb-2">Session Complete!</h1>
        <p className="text-muted-foreground">
          Great job! Here's your performance summary
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Target className="w-7 h-7" />
            </div>
            <div>
              <div className="text-sm opacity-90">Total Repetitions</div>
              <div className="text-4xl font-semibold">{sessionData.totalReps}</div>
            </div>
          </div>
          <div className="text-sm opacity-90">
            {sessionData.incorrectPosture} with incorrect posture
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <div className="text-sm opacity-90">Accuracy Score</div>
              <div className="text-4xl font-semibold">{sessionData.accuracy}%</div>
            </div>
          </div>
          <div className="text-sm opacity-90">
            Excellent performance!
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="bg-white rounded-2xl border border-border p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6">Session Details</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Clock className="w-7 h-7 text-blue-600" />
            </div>
            <div className="text-2xl font-semibold mb-1">{sessionData.duration}</div>
            <div className="text-sm text-muted-foreground">Duration</div>
          </div>

          <div className="text-center">
            <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-7 h-7 text-green-600" />
            </div>
            <div className="text-2xl font-semibold mb-1">{sessionData.calories}</div>
            <div className="text-sm text-muted-foreground">Calories Burned</div>
          </div>

          <div className="text-center">
            <div className="w-14 h-14 bg-purple-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Target className="w-7 h-7 text-purple-600" />
            </div>
            <div className="text-2xl font-semibold mb-1">{sessionData.totalReps}</div>
            <div className="text-sm text-muted-foreground">Completed Reps</div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-2xl border border-border p-6 mb-8">
        <h3 className="font-semibold mb-4">Accuracy Breakdown</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Correct Posture</span>
              <span className="font-semibold text-green-600">
                {sessionData.totalReps - sessionData.incorrectPosture} reps
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${((sessionData.totalReps - sessionData.incorrectPosture) / sessionData.totalReps) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Needs Improvement</span>
              <span className="font-semibold text-orange-600">
                {sessionData.incorrectPosture} reps
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all"
                style={{ width: `${(sessionData.incorrectPosture / sessionData.totalReps) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Feedback */}
      <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-2xl p-6 border border-border mb-8">
        <h3 className="font-semibold mb-3">Tips for Improvement</h3>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm">Focus on keeping your back straight during the movement</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm">Maintain a steady pace - quality over quantity</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm">Great progress! You're 13% better than last session</span>
          </li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 justify-center">
        <button
          onClick={() => navigate("/demo-video")}
          className="px-8 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium"
        >
          Start Another Session
        </button>
        <button
          onClick={() => navigate("/progress")}
          className="px-8 py-3 bg-white border border-border text-foreground rounded-xl hover:bg-muted transition-colors font-medium flex items-center gap-2"
        >
          <TrendingUp className="w-5 h-5" />
          View Progress
        </button>
        <button className="px-6 py-3 bg-white border border-border text-foreground rounded-xl hover:bg-muted transition-colors">
          <Share2 className="w-5 h-5" />
        </button>
        <button className="px-6 py-3 bg-white border border-border text-foreground rounded-xl hover:bg-muted transition-colors">
          <Download className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}