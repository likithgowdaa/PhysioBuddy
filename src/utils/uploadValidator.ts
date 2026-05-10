// ============================================================
// uploadValidator.ts — Heuristic Image Validation
// ============================================================

export interface ValidationResult {
  isValid: boolean;
  type: 'xray' | 'prescription' | 'unknown';
  confidence: number;
  message: string;
}

/**
 * Validate an uploaded file using canvas-based heuristics.
 * X-ray: mostly grayscale, medium brightness, high contrast.
 * Prescription: mostly white/bright, high edge density (text), or PDF/doc file.
 */
export async function validateUpload(
  file: File,
  expectedType: 'xray' | 'prescription',
): Promise<ValidationResult> {
  // Auto-pass for document file types (prescription)
  if (expectedType === 'prescription') {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
      return {
        isValid: true,
        type: 'prescription',
        confidence: 0.95,
        message: 'Document file accepted.',
      };
    }
  }

  // Must be an image for canvas analysis
  if (!file.type.startsWith('image/')) {
    if (expectedType === 'prescription') {
      return {
        isValid: false,
        type: 'unknown',
        confidence: 0,
        message: 'Invalid file type. Please upload a prescription image or PDF.',
      };
    }
    return {
      isValid: false,
      type: 'unknown',
      confidence: 0,
      message: 'Invalid file type. Please upload an X-ray image.',
    };
  }

  // Load image onto offscreen canvas for pixel analysis
  try {
    const stats = await analyzeImage(file);

    if (expectedType === 'xray') {
      return validateXray(stats);
    } else {
      return validatePrescription(stats);
    }
  } catch (err) {
    console.warn('[PhysioBuddy] Image analysis failed:', err);
    // On analysis failure, allow the upload (graceful degradation)
    return {
      isValid: true,
      type: expectedType,
      confidence: 0.5,
      message: 'Could not verify image. Proceeding with upload.',
    };
  }
}

// ---- Internal helpers ----

interface ImageStats {
  avgBrightness: number;   // 0-255
  grayscaleRatio: number;  // 0-1 (fraction of pixels where R≈G≈B)
  brightPixelRatio: number; // fraction of pixels with brightness > 200
  darkPixelRatio: number;  // fraction of pixels with brightness < 50
  contrastVariance: number; // variance of brightness values
  colorfulness: number;    // average chroma saturation
}

async function analyzeImage(file: File): Promise<ImageStats> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Downsample to 100×100 for speed
      const size = 100;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;

      let totalBrightness = 0;
      let grayscaleCount = 0;
      let brightCount = 0;
      let darkCount = 0;
      let totalChroma = 0;
      const brightnessValues: number[] = [];

      const totalPixels = size * size;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const brightness = (r + g + b) / 3;
        totalBrightness += brightness;
        brightnessValues.push(brightness);

        if (brightness > 200) brightCount++;
        if (brightness < 50) darkCount++;

        // Grayscale check: R, G, B within ±15 of each other
        const maxRGB = Math.max(r, g, b);
        const minRGB = Math.min(r, g, b);
        if (maxRGB - minRGB <= 15) grayscaleCount++;

        // Colorfulness: chroma distance from gray
        totalChroma += maxRGB - minRGB;
      }

      const avgBrightness = totalBrightness / totalPixels;
      const grayscaleRatio = grayscaleCount / totalPixels;
      const brightPixelRatio = brightCount / totalPixels;
      const darkPixelRatio = darkCount / totalPixels;
      const colorfulness = totalChroma / totalPixels;

      // Variance
      const mean = avgBrightness;
      const variance =
        brightnessValues.reduce((s, v) => s + (v - mean) ** 2, 0) / totalPixels;

      resolve({
        avgBrightness,
        grayscaleRatio,
        brightPixelRatio,
        darkPixelRatio,
        contrastVariance: variance,
        colorfulness,
      });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

function validateXray(stats: ImageStats): ValidationResult {
  // X-ray characteristics:
  // - Mostly grayscale (grayscaleRatio > 0.60)
  // - Medium brightness (40–200)
  // - Not too colorful (colorfulness < 30)
  // - Some contrast (variance > 500)

  const isGrayscale = stats.grayscaleRatio > 0.55;
  const isNotTooColorful = stats.colorfulness < 35;
  const hasMediumBrightness = stats.avgBrightness > 30 && stats.avgBrightness < 220;
  const hasContrast = stats.contrastVariance > 300;

  const score = [isGrayscale, isNotTooColorful, hasMediumBrightness, hasContrast]
    .filter(Boolean).length;

  if (score >= 3) {
    return {
      isValid: true,
      type: 'xray',
      confidence: score / 4,
      message: 'X-ray image validated successfully.',
    };
  }

  return {
    isValid: false,
    type: 'unknown',
    confidence: score / 4,
    message: 'Invalid medical input. Please upload a valid X-ray image (grayscale bone structure).',
  };
}

function validatePrescription(stats: ImageStats): ValidationResult {
  // Prescription characteristics:
  // - Mostly bright/white background (brightPixelRatio > 0.40)
  // - High contrast variance (text creates edges)
  // - OR mostly grayscale (scanned document)

  const isBright = stats.brightPixelRatio > 0.35;
  const hasText = stats.contrastVariance > 1000;
  const isDocument = stats.grayscaleRatio > 0.6 && isBright;

  if (isBright && (hasText || isDocument)) {
    return {
      isValid: true,
      type: 'prescription',
      confidence: 0.8,
      message: 'Prescription image validated successfully.',
    };
  }

  // Low-confidence pass: mostly white could be a prescription
  if (stats.brightPixelRatio > 0.5) {
    return {
      isValid: true,
      type: 'prescription',
      confidence: 0.6,
      message: 'Image appears to be a document.',
    };
  }

  return {
    isValid: false,
    type: 'unknown',
    confidence: 0.2,
    message: 'Invalid medical input. Please upload a prescription document or image.',
  };
}
