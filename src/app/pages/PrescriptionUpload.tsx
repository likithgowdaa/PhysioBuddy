import { useState } from "react";
import { Upload, FileText, X, CheckCircle, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";
import { allExercises, setState } from "../../utils/store";
import type { ExerciseType } from "../../utils/poseUtils";
import { validateUpload } from "../../utils/uploadValidator";
import { extractText, matchExercises, getMatchedKeywords } from "../../services/ocrService";

export function PrescriptionUpload() {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [matchedTypes, setMatchedTypes] = useState<ExerciseType[]>([]);
  const [extractedSummary, setExtractedSummary] = useState('');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    setValidationError(null);
    setShowRecommendations(false);
    setIsValidating(true);
    setUploadedFile(file);
    setAnalysisProgress(0);
    setMatchedTypes([]);
    setExtractedSummary('');

    const result = await validateUpload(file, 'prescription');

    if (!result.isValid) {
      setIsValidating(false);
      setValidationError(result.message);
      setShowRecommendations(false);
      return;
    }

    // Run OCR to extract text from the prescription
    try {
      const text = await extractText(file, (progress) => {
        setAnalysisProgress(progress);
      });

      console.log('[PhysioBuddy] OCR extracted text:', text.substring(0, 200));

      // Match medical keywords from extracted text
      const exercises = matchExercises(text);
      const keywords = getMatchedKeywords(text);

      setMatchedTypes(exercises);
      setExtractedSummary(
        keywords.length > 0
          ? `Detected: ${keywords.slice(0, 4).join(', ')}`
          : text.length > 10
            ? `Extracted ${text.split(/\s+/).length} words from prescription`
            : 'Based on your prescription'
      );
    } catch (err) {
      console.error('[PhysioBuddy] OCR error:', err);
      // Fallback: if OCR fails, still show default recommendations
      setMatchedTypes([]);
      setExtractedSummary('Based on your prescription');
    }

    setIsValidating(false);
    setShowRecommendations(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Get recommended exercises based on OCR analysis
  const getRecommendedExercises = () => {
    if (!uploadedFile || validationError || isValidating) return [];

    // Use OCR-matched exercises if available
    if (matchedTypes.length > 0) {
      return allExercises.filter((e) => matchedTypes.includes(e.type)).slice(0, 4);
    }

    // Fallback: return general defaults
    return allExercises.slice(0, 3);
  };

  const recommendedExercises = getRecommendedExercises();

  const handleExerciseClick = (exerciseType: ExerciseType) => {
    setState({ selectedExercise: exerciseType });
    navigate("/demo-video");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Upload Prescription</h1>
        <p className="text-muted-foreground">
          Upload your doctor's prescription to get personalized exercise recommendations
        </p>
      </div>

      {/* Upload Area */}
      <div className="mb-8">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`bg-white rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
            isDragging
              ? "border-primary bg-primary/5"
              : uploadedFile
              ? "border-green-500 bg-green-50"
              : "border-border hover:border-primary"
          }`}
        >
          {uploadedFile ? (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">
                  {isValidating ? 'Analyzing Prescription...' : 'File Uploaded Successfully'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {isValidating
                    ? `Reading text from document... ${analysisProgress > 0 ? `${analysisProgress}%` : ''}`
                    : uploadedFile.name}
                </p>
                <button
                  onClick={() => {
                    setUploadedFile(null);
                    setShowRecommendations(false);
                  }}
                  className="inline-flex items-center gap-2 text-destructive hover:underline"
                >
                  <X className="w-4 h-4" />
                  Remove file
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">
                  {isDragging ? "Drop your file here" : "Drag & drop your prescription"}
                </h3>
                <p className="text-muted-foreground mb-4">or</p>
                <label className="inline-block">
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                  />
                  <span className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors cursor-pointer inline-block font-medium">
                    Browse Files
                  </span>
                </label>
                <p className="text-sm text-muted-foreground mt-4">
                  Supported formats: PDF, JPG, PNG
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* File Preview */}
      {uploadedFile && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">File Preview</h2>
          <div className="bg-white rounded-2xl border border-border p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold mb-1 truncate">{uploadedFile.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {(uploadedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <div className="text-green-600">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommended Exercises */}
      {showRecommendations && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-xl font-semibold mb-4">Recommended Exercises</h2>
          <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-2xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">AI Analysis Complete</h3>
                <p className="text-sm text-muted-foreground">
                  {extractedSummary || 'Based on your prescription'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {recommendedExercises.map((exercise) => (
                <button
                  key={exercise.type}
                  onClick={() => handleExerciseClick(exercise.type)}
                  className="w-full bg-white rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-all group"
                >
                  <div className="text-left">
                    <h4 className="font-semibold group-hover:text-primary transition-colors">
                      {exercise.name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {exercise.difficulty} • {exercise.duration}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>

            <button
              onClick={() => navigate("/exercise-search")}
              className="w-full mt-4 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium"
            >
              View All Exercises
            </button>
          </div>
        </div>
      )}
    </div>
  );
}