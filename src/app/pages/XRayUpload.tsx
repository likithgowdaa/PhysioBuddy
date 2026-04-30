import { useState } from "react";
import { Upload, ScanLine, CheckCircle, ChevronRight, X } from "lucide-react";
import { useNavigate } from "react-router";

export function XRayUpload() {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [detectedPart, setDetectedPart] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
        // Simulate AI detection
        setTimeout(() => setDetectedPart("Knee Joint"), 2000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
        setTimeout(() => setDetectedPart("Knee Joint"), 2000);
      };
      reader.readAsDataURL(file);
    }
  };

  const suggestedExercises = [
    { name: "Knee Extension", benefit: "Strengthens quadriceps", difficulty: "Beginner" },
    { name: "Leg Raises", benefit: "Improves flexibility", difficulty: "Beginner" },
    { name: "Step-ups", benefit: "Builds stability", difficulty: "Intermediate" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Upload X-Ray</h1>
        <p className="text-muted-foreground">
          Upload your X-ray for AI-powered analysis and exercise recommendations
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Upload Image</h2>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`bg-white rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
              isDragging
                ? "border-primary bg-primary/5"
                : uploadedImage
                ? "border-green-500"
                : "border-border hover:border-primary"
            }`}
          >
            {uploadedImage ? (
              <div className="space-y-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <p className="font-semibold">X-Ray Uploaded</p>
                <button
                  onClick={() => {
                    setUploadedImage(null);
                    setDetectedPart(null);
                  }}
                  className="inline-flex items-center gap-2 text-destructive hover:underline"
                >
                  <X className="w-4 h-4" />
                  Remove image
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">
                    {isDragging ? "Drop your X-ray here" : "Drag & drop your X-ray"}
                  </h3>
                  <p className="text-muted-foreground mb-4">or</p>
                  <label>
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      accept="image/*"
                      className="hidden"
                    />
                    <span className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors cursor-pointer inline-block font-medium">
                      Browse Images
                    </span>
                  </label>
                  <p className="text-sm text-muted-foreground mt-4">
                    Supported: JPG, PNG, DICOM
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* AI Analysis Status */}
          {uploadedImage && !detectedPart && (
            <div className="mt-6 bg-blue-50 rounded-2xl p-6 border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="animate-spin">
                  <ScanLine className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">AI Analysis in Progress</h3>
                  <p className="text-sm text-muted-foreground">
                    Detecting body part and analyzing...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Detection Result */}
          {detectedPart && (
            <div className="mt-6 bg-green-50 rounded-2xl p-6 border border-green-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Detection Complete</h3>
                  <p className="text-sm text-muted-foreground">
                    Detected: <span className="font-semibold text-foreground">{detectedPart}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview & Results */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Preview</h2>
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            {uploadedImage ? (
              <img
                src={uploadedImage}
                alt="X-Ray Preview"
                className="w-full h-auto"
              />
            ) : (
              <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <ScanLine className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                  <p className="text-muted-foreground">No image uploaded</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Suggested Exercises */}
      {detectedPart && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-xl font-semibold mb-4">Suggested Exercises</h2>
          <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-2xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <ScanLine className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Personalized for {detectedPart}</h3>
                <p className="text-sm text-muted-foreground">
                  Based on AI analysis of your X-ray
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {suggestedExercises.map((exercise, index) => (
                <button
                  key={index}
                  onClick={() => navigate("/demo-video")}
                  className="bg-white rounded-xl p-4 text-left hover:shadow-lg transition-all hover:-translate-y-1 group"
                >
                  <div className="aspect-square bg-gradient-to-br from-blue-100 to-green-100 rounded-lg mb-3 flex items-center justify-center">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow">
                      <ScanLine className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <h4 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                    {exercise.name}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">{exercise.benefit}</p>
                  <span className={`inline-block text-xs px-2 py-1 rounded-full ${
                    exercise.difficulty === "Beginner" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                  }`}>
                    {exercise.difficulty}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => navigate("/exercise-search")}
              className="w-full mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium"
            >
              Explore All Exercises
            </button>
          </div>
        </div>
      )}
    </div>
  );
}