import { useState } from "react";
import { Search, ChevronRight, Activity } from "lucide-react";
import { useNavigate } from "react-router";
import { Input } from "../components/design-system/Input";
import { Card } from "../components/design-system/Card";
import { Button } from "../components/design-system/Button";
import { allExercises } from "../../utils/store";
import { setState } from "../../utils/store";

const categories = ["All", "Upper Body", "Lower Body", "Posture / Rehab"];

export function ExerciseSearch() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredExercises = allExercises.filter((exercise) => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || exercise.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const suggestions = searchQuery.length > 0 ? filteredExercises.slice(0, 5) : [];

  const handleSelectExercise = (exerciseType: string) => {
    setState({ selectedExercise: exerciseType as any });
    navigate("/demo-video");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Exercise Search</h1>
        <p className="text-muted-foreground">
          Find the perfect exercise for your recovery
        </p>
      </div>

      {/* Enhanced Search Bar */}
      <div className="mb-6 relative">
        <Input
          variant="search"
          type="text"
          placeholder="Search exercises... (e.g., Knee Extension, Shoulder Abduction)"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className="text-lg py-4 shadow-md"
        />

        {/* Enhanced Auto-suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <Card variant="elevated" padding="none" className="absolute top-full mt-2 w-full overflow-hidden z-10 animate-in slide-in-from-top-2">
            {suggestions.map((exercise) => (
              <button
                key={exercise.type}
                onClick={() => {
                  setSearchQuery(exercise.name);
                  setShowSuggestions(false);
                  handleSelectExercise(exercise.type);
                }}
                className="w-full px-5 py-4 text-left hover:bg-muted/70 transition-all flex items-center justify-between group border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold group-hover:text-primary transition-colors">{exercise.name}</div>
                    <div className="text-sm text-muted-foreground">{exercise.category} • {exercise.duration}</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            ))}
          </Card>
        )}
      </div>

      {/* Enhanced Categories */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Categories</h2>
        <div className="flex flex-wrap gap-3">
          {categories.map((category) => (
            <Button
              key={category}
              onClick={() => setSelectedCategory(category)}
              variant={selectedCategory === category ? "primary" : "outline"}
              size="md"
              className="min-w-[120px]"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Recommended Exercises */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {searchQuery ? "Search Results" : "Recommended Exercises"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredExercises.map((exercise) => (
            <Card
              key={exercise.type}
              variant="elevated"
              className="cursor-pointer hover:-translate-y-2 text-left group transition-all duration-300"
              onClick={() => handleSelectExercise(exercise.type)}
            >
              <div className="aspect-video bg-gradient-to-br from-blue-50 via-blue-100 to-green-100 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10" />
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform relative z-10">
                  <Activity className="w-10 h-10 text-primary" />
                </div>
              </div>
              <h3 className="font-semibold text-lg mb-3 group-hover:text-primary transition-colors">
                {exercise.name}
              </h3>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    exercise.difficulty === "Beginner" ? "bg-success" : "bg-warning"
                  }`} />
                  <span className="font-medium">{exercise.difficulty}</span>
                </span>
                <span className="text-muted-foreground font-medium">{exercise.duration}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}