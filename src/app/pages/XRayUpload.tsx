import { useState } from "react";
import { Upload, ScanLine, CheckCircle, ChevronRight, X } from "lucide-react";
import { useNavigate } from "react-router";
import { allExercises, setState } from "../../utils/store";
import type { ExerciseType } from "../../utils/poseUtils";
import { validateUpload } from "../../utils/uploadValidator";
import Tesseract from "tesseract.js";

// All detectable body parts
const BODY_PARTS = [
  'Knee Joint',
  'Shoulder Joint',
  'Elbow Joint',
  'Spine / Back',
  'Cervical Spine',
  'Hip Joint',
  'Ankle Joint',
  'Wrist Joint',
] as const;

export function XRayUpload() {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [detectedPart, setDetectedPart] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [analysisDetail, setAnalysisDetail] = useState('');
  const [showManualSelect, setShowManualSelect] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // ---- Detection Layer 1: OCR with X-ray image preprocessing ----

  /** Pre-process X-ray image for better OCR: invert colors + boost contrast */
  const preprocessForOCR = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('No canvas')); return; }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Invert colors and boost contrast for text on dark X-ray backgrounds
        for (let i = 0; i < data.length; i += 4) {
          // Invert
          let r = 255 - data[i];
          let g = 255 - data[i + 1];
          let b = 255 - data[i + 2];

          // Boost contrast (stretch toward black/white)
          r = Math.min(255, Math.max(0, ((r - 128) * 1.8) + 128));
          g = Math.min(255, Math.max(0, ((g - 128) * 1.8) + 128));
          b = Math.min(255, Math.max(0, ((b - 128) * 1.8) + 128));

          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  /** Run OCR on both original and preprocessed (inverted) X-ray images */
  const runXRayOCR = async (file: File): Promise<string> => {
    let combinedText = '';

    // OCR on original image
    try {
      const originalUrl = URL.createObjectURL(file);
      const result1 = await Tesseract.recognize(originalUrl, 'eng', {
        logger: (info) => {
          if (info.status === 'recognizing text') {
            setAnalysisDetail(`Reading original image... ${Math.round(info.progress * 50)}%`);
          }
        },
      });
      URL.revokeObjectURL(originalUrl);
      combinedText += result1.data.text + ' ';
    } catch {
      // Original OCR failed
    }

    // OCR on inverted/contrast-boosted image (text labels become visible)
    try {
      const processedUrl = await preprocessForOCR(file);
      const result2 = await Tesseract.recognize(processedUrl, 'eng', {
        logger: (info) => {
          if (info.status === 'recognizing text') {
            setAnalysisDetail(`Reading enhanced image... ${50 + Math.round(info.progress * 50)}%`);
          }
        },
      });
      combinedText += result2.data.text;
    } catch {
      // Inverted OCR failed
    }

    return combinedText.trim();
  };

  /** Match OCR text against medical/anatomical keywords */
  const detectBodyPartFromText = (text: string): string | null => {
    if (!text || text.length < 3) return null;

    const patterns: [RegExp, string][] = [
      // Cervical/Neck — check before general spine
      [/\b(cervical|c[\s-]?spine|neck|c[1-7]|atlas|axis|odontoid)\b/i, 'Cervical Spine'],
      // Knee
      [/\b(knee|patella|patellar|tibia|fibula|meniscus|acl|mcl|pcl|cruciate)\b/i, 'Knee Joint'],
      // Shoulder
      [/\b(shoulder|scapula|clavicle|humerus|rotator|acromion|glenohumeral|acromioclavicular)\b/i, 'Shoulder Joint'],
      // Elbow
      [/\b(elbow|olecranon|ulna|radial\s*head|epicondyle)\b/i, 'Elbow Joint'],
      // Spine/Back (after cervical)
      [/\b(spine|spinal|lumbar|thoracic|vertebr|l[\s-]?spine|t[\s-]?spine|sacr|coccyx|disc|scoliosis|lordosis|kyphosis)\b/i, 'Spine / Back'],
      // Hip
      [/\b(hip|pelvis|pelvic|femur|femoral|acetabul|ilium|ischium|pubis|trochanter)\b/i, 'Hip Joint'],
      // Ankle
      [/\b(ankle|malleolus|talus|calcaneus|calcaneum|achilles)\b/i, 'Ankle Joint'],
      // Foot
      [/\b(foot|metatarsal|phalanx|phalanges|plantar|heel)\b/i, 'Ankle Joint'],
      // Wrist/Hand
      [/\b(wrist|carpal|scaphoid|lunate|metacarpal|hand|finger|thumb)\b/i, 'Wrist Joint'],
      // Chest/Rib → categorize as spine/back for exercise purposes
      [/\b(chest|lung|rib|thorax|cardiac|heart|mediastin|diaphragm|pa\s*view|ap\s*view)\b/i, 'Spine / Back'],
    ];

    for (const [pattern, part] of patterns) {
      if (pattern.test(text)) return part;
    }

    return null;
  };

  // ---- Detection Layer 2: Filename keywords ----

  const detectBodyPartFromFilename = (fileName: string): string | null => {
    const lower = fileName.toLowerCase();
    const map: [string[], string][] = [
      [['cervical', 'neck', 'c-spine'], 'Cervical Spine'],
      [['knee', 'patella', 'tibia', 'meniscus'], 'Knee Joint'],
      [['shoulder', 'scapula', 'clavicle', 'humerus'], 'Shoulder Joint'],
      [['elbow', 'olecranon', 'ulna'], 'Elbow Joint'],
      [['spine', 'lumbar', 'thoracic', 'back', 'vertebr'], 'Spine / Back'],
      [['hip', 'pelvis', 'femur'], 'Hip Joint'],
      [['ankle', 'foot', 'calcaneus', 'malleolus'], 'Ankle Joint'],
      [['wrist', 'hand', 'carpal', 'scaphoid'], 'Wrist Joint'],
      [['chest', 'lung', 'rib', 'thorax'], 'Spine / Back'],
    ];
    for (const [keywords, part] of map) {
      if (keywords.some((kw) => lower.includes(kw))) return part;
    }
    return null;
  };

  // ---- Main processing ----

  const processFile = async (file: File) => {
    setValidationError(null);
    setDetectedPart(null);
    setIsValidating(true);
    setUploadedFileName(file.name);
    setAnalysisDetail('Validating X-ray image...');
    setShowManualSelect(false);

    // Read the file for preview
    const reader = new FileReader();
    await new Promise<void>((resolve) => {
      reader.onload = (ev) => {
        setUploadedImage(ev.target?.result as string);
        resolve();
      };
      reader.readAsDataURL(file);
    });

    // Validate the upload
    const result = await validateUpload(file, 'xray');

    if (!result.isValid) {
      setIsValidating(false);
      setValidationError(result.message);
      setDetectedPart(null);
      return;
    }

    // Layer 1: Try filename detection first (instant, often correct)
    const filenameResult = detectBodyPartFromFilename(file.name);
    if (filenameResult) {
      console.log('[PhysioBuddy] Detected from filename:', filenameResult);
    }

    // Layer 2: Run OCR on original + inverted X-ray for text labels
    setAnalysisDetail('Scanning X-ray for text labels...');
    let ocrResult: string | null = null;
    try {
      const ocrText = await runXRayOCR(file);
      console.log('[PhysioBuddy] X-ray OCR text:', ocrText.substring(0, 200));
      if (ocrText.length > 3) {
        ocrResult = detectBodyPartFromText(ocrText);
        if (ocrResult) {
          console.log('[PhysioBuddy] Detected from OCR:', ocrResult);
        }
      }
    } catch (err) {
      console.warn('[PhysioBuddy] OCR failed:', err);
    }

    // Decide final result: OCR > Filename > Manual select
    const finalPart = ocrResult || filenameResult;

    if (finalPart) {
      setAnalysisDetail(
        ocrResult
          ? `Text label detected: "${finalPart}"`
          : `Detected from filename: "${finalPart}"`
      );
      setIsValidating(false);
      setDetectedPart(finalPart);
    } else {
      // Neither OCR nor filename matched → ask user to select
      setAnalysisDetail('Could not auto-detect body part. Please select manually.');
      setIsValidating(false);
      setShowManualSelect(true);
    }
  };

  /** User manually selects body part */
  const handleManualSelect = (part: string) => {
    setDetectedPart(part);
    setShowManualSelect(false);
    setAnalysisDetail(`Manually selected: ${part}`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      processFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Get exercises matching the detected body part
  const getSuggestedExercises = () => {
    // Block suggestions if validation failed
    if (validationError || isValidating || !detectedPart) return [];
    const partKeywords: Record<string, ExerciseType[]> = {
      'Knee Joint': ['knee_rotation', 'straight_leg_raise', 'sit_to_stand', 'squat'],
      'Shoulder Joint': ['shoulder_abduction', 'shoulder_flexion', 'shoulder_internal_external_rotation', 'arm_raise_rehab'],
      'Elbow Joint': ['elbow_flexion', 'arm_raise_rehab'],
      'Spine / Back': ['back_straightening', 'sit_to_stand', 'basic_core_activation'],
      'Cervical Spine': ['neck_alignment', 'back_straightening'],
      'Hip Joint': ['straight_leg_raise', 'sit_to_stand', 'squat'],
      'Ankle Joint': ['heel_raises', 'toe_raises', 'squat'],
      'Wrist Joint': ['elbow_flexion', 'shoulder_flexion'],
    };
    const types = partKeywords[detectedPart] ?? ['knee_rotation', 'back_straightening'];
    return allExercises.filter((e) => types.includes(e.type)).slice(0, 3);
  };

  const suggestedExercises = getSuggestedExercises();

  const handleExerciseClick = (exerciseType: ExerciseType) => {
    setState({ selectedExercise: exerciseType });
    navigate("/demo-video");
  };

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
                    setShowManualSelect(false);
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
          {uploadedImage && !detectedPart && isValidating && (
            <div className="mt-6 bg-blue-50 rounded-2xl p-6 border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="animate-spin">
                  <ScanLine className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">AI Analysis in Progress</h3>
                  <p className="text-sm text-muted-foreground">
                    {analysisDetail || 'Detecting body part and analyzing...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Manual Body Part Selection — shown when auto-detection fails */}
          {showManualSelect && !detectedPart && (
            <div className="mt-6 bg-orange-50 rounded-2xl p-6 border border-orange-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="font-semibold mb-1">Select Body Part</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We couldn't auto-detect the body part. Please select it manually:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {BODY_PARTS.map((part) => (
                  <button
                    key={part}
                    onClick={() => handleManualSelect(part)}
                    className="px-4 py-2.5 bg-white border border-border rounded-xl text-sm font-medium hover:bg-primary hover:text-white hover:border-primary transition-colors text-left"
                  >
                    {part}
                  </button>
                ))}
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
                  {analysisDetail || 'Based on AI analysis of your X-ray'}
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {suggestedExercises.map((exercise) => (
                <button
                  key={exercise.type}
                  onClick={() => handleExerciseClick(exercise.type)}
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
                  <p className="text-sm text-muted-foreground mb-2">{exercise.targetArea}</p>
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