import { useState } from "react";
import { Play, Pause, RotateCcw, CheckCircle, Volume2, Target, Clock, Dumbbell } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "../components/design-system/Button";
import { Card } from "../components/design-system/Card";

export function DemoVideo() {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const totalDuration = 45; // seconds

  const handleStartExercise = () => {
    navigate("/exercise-monitoring");
  };

  const progressPercentage = (currentTime / totalDuration) * 100;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold mb-2">Exercise Demo</h1>
        <p className="text-muted-foreground">
          Watch the demonstration carefully before starting your session
        </p>
      </div>

      {/* Main Demo Video */}
      <Card variant="elevated" padding="none" className="mb-6">
        {/* Video Player */}
        <div className="relative aspect-video bg-gradient-to-br from-slate-900 to-slate-800">
          <img
            src="https://images.unsplash.com/photo-1764314359427-6e685ce5b719?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaHlzaW90aGVyYXB5JTIwZXhlcmNpc2UlMjBtZWRpY2FsfGVufDF8fHx8MTc3NjM1MDMxN3ww&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Exercise Demo"
            className="w-full h-full object-cover"
          />
          
          {/* Video Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Play/Pause Button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 group"
          >
            {isPlaying ? (
              <Pause className="w-10 h-10 text-primary" />
            ) : (
              <Play className="w-10 h-10 text-primary ml-1" />
            )}
          </button>

          {/* Video Title Overlay */}
          <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-xl px-4 py-2">
            <h3 className="text-white font-semibold">Knee Extension Exercise</h3>
            <p className="text-white/80 text-sm">Beginner Level</p>
          </div>

          {/* Volume Control */}
          <button className="absolute top-4 right-4 w-10 h-10 bg-black/70 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-black/80 transition-colors">
            <Volume2 className="w-5 h-5 text-white" />
          </button>

          {/* Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-3 text-white text-sm mb-2">
              <span>{Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')}</span>
              <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span>{Math.floor(totalDuration / 60)}:{(totalDuration % 60).toString().padStart(2, '0')}</span>
            </div>
          </div>
        </div>

        {/* Video Controls */}
        <div className="bg-muted/50 px-6 py-4 flex items-center justify-center gap-4">
          <button
            onClick={() => setCurrentTime(0)}
            className="p-3 hover:bg-white rounded-lg transition-colors"
          >
            <RotateCcw className="w-5 h-5 text-foreground" />
          </button>
          <Button
            onClick={() => setIsPlaying(!isPlaying)}
            variant="primary"
            icon={isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          >
            {isPlaying ? "Pause" : "Play Demo"}
          </Button>
        </div>
      </Card>

      {/* Instructions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card variant="elevated">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-primary font-semibold">1</span>
            </div>
            Key Points to Remember
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm">Keep your back straight throughout the movement</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm">Extend your leg slowly and controlled</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm">Hold at the top for 2 seconds</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm">Return to starting position smoothly</span>
            </li>
          </ul>
        </Card>

        <Card variant="elevated">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 font-semibold">2</span>
            </div>
            Before You Start
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm">Position yourself 6-8 feet from the camera</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm">Ensure your full body is visible in the frame</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm">Use proper lighting (face the light source)</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm">Wear comfortable, visible clothing</span>
            </li>
          </ul>
        </Card>
      </div>

      {/* Exercise Details with Enhanced Design */}
      <Card variant="gradient" className="mb-6">
        <h3 className="font-semibold mb-4">Exercise Details</h3>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Target Area</div>
              <div className="font-semibold">Knee / Quadriceps</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Duration</div>
              <div className="font-semibold">10-12 minutes</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-teal/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Dumbbell className="w-5 h-5 text-teal" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Recommended Reps</div>
              <div className="font-semibold">3 sets × 10 reps</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Enhanced Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          onClick={() => navigate("/exercise-search")}
          variant="outline"
          size="lg"
        >
          Choose Different Exercise
        </Button>
        <Button
          onClick={handleStartExercise}
          variant="primary"
          size="xl"
          icon={<Play className="w-6 h-6" />}
        >
          Start Exercise Session
        </Button>
      </div>
    </div>
  );
}
