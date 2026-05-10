import { useState } from "react";
import { Play, Pause, RotateCcw, CheckCircle, Volume2, Target, Clock, Dumbbell } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "../components/design-system/Button";
import { Card } from "../components/design-system/Card";
import { getState, getExerciseInfo } from "../../utils/store";
import { getDemoVideo } from "../../utils/demoVideos";
import type { ExerciseType } from "../../utils/poseUtils";

// Curated per-exercise preview thumbnails (reliable Pexels images)
const exerciseThumbnails: Record<ExerciseType, string> = {
  elbow_flexion: 'https://images.pexels.com/photos/4162499/pexels-photo-4162499.jpeg?auto=compress&w=1280',
  shoulder_abduction: 'https://images.pexels.com/photos/3076509/pexels-photo-3076509.jpeg?auto=compress&w=1280',
  shoulder_abduction_stretch: 'https://images.pexels.com/photos/3076509/pexels-photo-3076509.jpeg?auto=compress&w=1280',
  shoulder_flexion: 'https://images.pexels.com/photos/4162497/pexels-photo-4162497.jpeg?auto=compress&w=1280',
  shoulder_internal_external_rotation: 'https://images.pexels.com/photos/3823207/pexels-photo-3823207.jpeg?auto=compress&w=1280',
  arm_raise_rehab: 'https://images.pexels.com/photos/4164761/pexels-photo-4164761.jpeg?auto=compress&w=1280',
  knee_rotation: 'https://images.pexels.com/photos/3756165/pexels-photo-3756165.jpeg?auto=compress&w=1280',
  straight_leg_raise: 'https://images.pexels.com/photos/3757376/pexels-photo-3757376.jpeg?auto=compress&w=1280',
  sit_to_stand: 'https://images.pexels.com/photos/3807571/pexels-photo-3807571.jpeg?auto=compress&w=1280',
  squat: 'https://images.pexels.com/photos/3775566/pexels-photo-3775566.jpeg?auto=compress&w=1280',
  single_leg_stand: 'https://images.pexels.com/photos/3807571/pexels-photo-3807571.jpeg?auto=compress&w=1280',
  heel_raises: 'https://images.pexels.com/photos/3775566/pexels-photo-3775566.jpeg?auto=compress&w=1280',
  toe_raises: 'https://images.pexels.com/photos/3775566/pexels-photo-3775566.jpeg?auto=compress&w=1280',
  back_straightening: 'https://images.pexels.com/photos/3768916/pexels-photo-3768916.jpeg?auto=compress&w=1280',
  neck_alignment: 'https://images.pexels.com/photos/3845810/pexels-photo-3845810.jpeg?auto=compress&w=1280',
  basic_core_activation: 'https://images.pexels.com/photos/3768916/pexels-photo-3768916.jpeg?auto=compress&w=1280',
};

export function DemoVideo() {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  // Read selected exercise from store
  const selectedExercise = getState().selectedExercise;
  const exerciseInfo = getExerciseInfo(selectedExercise);
  const demoVideo = getDemoVideo(selectedExercise);

  const handleStartExercise = () => {
    navigate("/exercise-monitoring");
  };

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
          {isPlaying ? (
            <iframe
              src={`${useFallback ? demoVideo.fallbackUrl : demoVideo.url}${useFallback || demoVideo.url.includes('?') ? '&' : '?'}autoplay=1`}
              title={demoVideo.title}
              className="w-full h-full"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onError={() => {
                if (!useFallback) {
                  setUseFallback(true);
                }
              }}
            />
          ) : (
            <>
              {/* Exercise-specific curated thumbnail */}
              <img
                src={exerciseThumbnails[selectedExercise]}
                alt={`${exerciseInfo.name} Demo`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {/* Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />
            </>
          )}
          
          {/* Play/Pause Button */}
          {!isPlaying && (
            <button
              onClick={() => setIsPlaying(true)}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 group z-10"
            >
              <Play className="w-10 h-10 text-primary ml-1" />
            </button>
          )}

          {/* Video Title Overlay */}
          {!isPlaying && (
            <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-xl px-4 py-2 z-10">
              <h3 className="text-white font-semibold">{exerciseInfo.name}</h3>
              <p className="text-white/80 text-sm">{exerciseInfo.difficulty} Level</p>
            </div>
          )}

          {/* Volume Control */}
          {!isPlaying && (
            <button className="absolute top-4 right-4 w-10 h-10 bg-black/70 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-black/80 transition-colors z-10">
              <Volume2 className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Duration Badge */}
          {!isPlaying && (
            <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-sm font-medium z-10">
              {demoVideo.duration}
            </div>
          )}
        </div>

        {/* Video Controls */}
        <div className="bg-muted/50 px-6 py-4 flex items-center justify-center gap-4">
          <button
            onClick={() => { setIsPlaying(false); setUseFallback(false); }}
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
              <span className="text-sm">Perform the movement slowly and controlled</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm">Hold at the peak position for 2 seconds</span>
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
              <div className="font-semibold">{exerciseInfo.targetArea}</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Duration</div>
              <div className="font-semibold">{exerciseInfo.duration}</div>
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
