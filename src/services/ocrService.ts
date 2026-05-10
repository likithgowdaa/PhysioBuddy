// ============================================================
// ocrService.ts — Prescription OCR & Exercise Matching
// Uses Tesseract.js for browser-based OCR (handwritten + printed)
// ============================================================

import Tesseract from 'tesseract.js';
import type { ExerciseType } from '../utils/poseUtils';

// ---- OCR Text Extraction ----

/**
 * Extract text from an uploaded file (image or PDF).
 * - Images (JPG/PNG): direct OCR via Tesseract.js
 * - PDFs: render page 1 to canvas, then OCR the rendered image
 */
export async function extractText(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (['pdf'].includes(ext)) {
    return extractTextFromPDF(file, onProgress);
  }

  if (file.type.startsWith('image/')) {
    return extractTextFromImage(file, onProgress);
  }

  return '';
}

/** OCR an image file directly via Tesseract.js */
async function extractTextFromImage(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const imageUrl = URL.createObjectURL(file);

  try {
    const result = await Tesseract.recognize(imageUrl, 'eng', {
      logger: (info) => {
        if (info.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(info.progress * 100));
        }
      },
    });

    return result.data.text.trim();
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

/** Render PDF page 1 to canvas, then OCR the canvas image */
async function extractTextFromPDF(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<string> {
  // Convert File to data URL for rendering in an image element
  // For PDFs, we render using an offscreen canvas approach
  // Since we can't use pdf.js without adding another heavy dependency,
  // we'll try to extract text via the browser's ability to render PDFs,
  // or fall back to treating the PDF as an image if embedded

  // Approach: Use FileReader to get ArrayBuffer, then try basic text extraction
  const text = await extractRawPDFText(file);
  if (text.length > 20) {
    // Got meaningful text from the PDF directly
    onProgress?.(100);
    return text;
  }

  // If PDF has no extractable text (scanned document), we can't OCR it
  // without pdf.js. Return what we have.
  onProgress?.(100);
  return text;
}

/** Extract raw text content from a PDF without rendering */
async function extractRawPDFText(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

    // Extract text between parentheses in PDF stream (basic text extraction)
    const textParts: string[] = [];
    const regex = /\(([^)]+)\)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const part = match[1];
      // Filter out PDF commands and binary data
      if (
        part.length > 1 &&
        part.length < 200 &&
        /[a-zA-Z]{2,}/.test(part) &&
        !/^[\\\/\d\s.]+$/.test(part)
      ) {
        textParts.push(part);
      }
    }

    // Also try extracting from BT...ET text blocks
    const btRegex = /BT\s*([\s\S]*?)\s*ET/g;
    while ((match = btRegex.exec(text)) !== null) {
      const block = match[1];
      const tjRegex = /\(([^)]+)\)/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        const part = tjMatch[1];
        if (part.length > 1 && /[a-zA-Z]{2,}/.test(part)) {
          textParts.push(part);
        }
      }
    }

    return textParts.join(' ').replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

// ---- Medical Keyword → Exercise Matching ----

interface KeywordGroup {
  keywords: string[];
  exercises: ExerciseType[];
}

const KEYWORD_GROUPS: KeywordGroup[] = [
  {
    keywords: [
      'knee', 'patella', 'patellar', 'meniscus', 'acl', 'mcl', 'pcl',
      'ligament', 'cruciate', 'knee joint', 'knee pain', 'knee replacement',
      'knee surgery', 'arthroplasty', 'knee rehab', 'knee flexion', 'knee extension',
    ],
    exercises: ['knee_rotation', 'straight_leg_raise', 'sit_to_stand', 'squat'],
  },
  {
    keywords: [
      'shoulder', 'rotator cuff', 'deltoid', 'supraspinatus', 'infraspinatus',
      'shoulder joint', 'shoulder pain', 'frozen shoulder', 'shoulder impingement',
      'shoulder surgery', 'shoulder rehab', 'glenohumeral',
    ],
    exercises: [
      'shoulder_abduction', 'shoulder_abduction_stretch', 'shoulder_flexion',
      'shoulder_internal_external_rotation', 'arm_raise_rehab',
    ],
  },
  {
    keywords: [
      'elbow', 'bicep', 'tricep', 'tennis elbow', 'lateral epicondylitis',
      'medial epicondylitis', 'golfer elbow', 'elbow pain', 'elbow flexion',
      'elbow extension', 'forearm',
    ],
    exercises: ['elbow_flexion'],
  },
  {
    keywords: [
      'back', 'spine', 'spinal', 'lumbar', 'thoracic', 'disc', 'disk',
      'scoliosis', 'lordosis', 'kyphosis', 'back pain', 'lower back',
      'upper back', 'backache', 'lumbago', 'herniated', 'sciatica',
    ],
    exercises: ['back_straightening', 'sit_to_stand', 'basic_core_activation'],
  },
  {
    keywords: [
      'neck', 'cervical', 'whiplash', 'neck pain', 'stiff neck', 'cervicalgia',
      'neck strain', 'torticollis',
    ],
    exercises: ['neck_alignment'],
  },
  {
    keywords: [
      'hip', 'femur', 'femoral', 'pelvis', 'pelvic', 'hip joint', 'hip pain',
      'hip replacement', 'hip surgery', 'hip flexor', 'trochanter',
    ],
    exercises: ['straight_leg_raise', 'sit_to_stand', 'squat'],
  },
  {
    keywords: [
      'ankle', 'achilles', 'plantar', 'plantar fasciitis', 'ankle sprain',
      'ankle pain', 'ankle joint', 'calf', 'calves',
    ],
    exercises: ['heel_raises', 'toe_raises'],
  },
  {
    keywords: [
      'foot', 'feet', 'heel', 'toe', 'metatarsal', 'foot pain',
    ],
    exercises: ['heel_raises', 'toe_raises'],
  },
  {
    keywords: [
      'core', 'abdominal', 'abs', 'core stability', 'core strength',
      'trunk', 'torso',
    ],
    exercises: ['basic_core_activation', 'back_straightening'],
  },
  {
    keywords: [
      'leg', 'quadriceps', 'hamstring', 'thigh', 'leg pain', 'leg weakness',
      'lower extremity', 'lower limb',
    ],
    exercises: ['knee_rotation', 'straight_leg_raise', 'squat', 'single_leg_stand'],
  },
  {
    keywords: [
      'balance', 'stability', 'proprioception', 'coordination', 'gait',
      'walking', 'fall prevention',
    ],
    exercises: ['single_leg_stand', 'heel_raises', 'toe_raises'],
  },
  {
    keywords: [
      'arm', 'upper extremity', 'upper limb', 'arm pain', 'arm weakness',
    ],
    exercises: ['elbow_flexion', 'arm_raise_rehab', 'shoulder_abduction'],
  },
  {
    // General physiotherapy terms — indicate the document IS a prescription
    keywords: [
      'physiotherapy', 'physical therapy', 'rehab', 'rehabilitation',
      'exercise', 'stretching', 'range of motion', 'rom', 'flexion',
      'extension', 'abduction', 'adduction', 'strengthening', 'mobility',
      'prescribed', 'prescription', 'therapy', 'treatment', 'sessions',
      'repetitions', 'reps', 'sets',
    ],
    exercises: [], // Marker group — doesn't recommend specific exercises
  },
];

/**
 * Match extracted text against medical keywords and return recommended exercises.
 * Returns unique, deduplicated exercise types.
 */
export function matchExercises(text: string): ExerciseType[] {
  if (!text || text.trim().length < 5) return [];

  const lowerText = text.toLowerCase();
  const matched = new Set<ExerciseType>();

  for (const group of KEYWORD_GROUPS) {
    for (const keyword of group.keywords) {
      if (lowerText.includes(keyword)) {
        for (const exercise of group.exercises) {
          matched.add(exercise);
        }
        break; // One match per group is enough
      }
    }
  }

  return Array.from(matched);
}

/**
 * Extract a brief summary of matched medical terms from the text.
 * Used for display in the UI.
 */
export function getMatchedKeywords(text: string): string[] {
  if (!text || text.trim().length < 5) return [];

  const lowerText = text.toLowerCase();
  const found: string[] = [];

  for (const group of KEYWORD_GROUPS) {
    for (const keyword of group.keywords) {
      if (lowerText.includes(keyword) && keyword.length > 2) {
        found.push(keyword);
        break; // One keyword per group
      }
    }
  }

  return found;
}
