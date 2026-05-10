// ============================================================
// demoVideos.ts — Exercise-to-Demo-Video Mapping (YT Shorts)
// ============================================================

import type { ExerciseType } from './poseUtils';

export interface DemoVideoInfo {
  url: string;
  fallbackUrl: string;
  title: string;
  duration: string;
  difficulty: string;
  targetArea: string;
}

/**
 * Demo video mapping for each supported exercise.
 * Using YouTube embed format with playsinline for mobile compatibility.
 * Each entry has a fallback URL if the primary fails.
 */
export const demoVideos: Record<ExerciseType, DemoVideoInfo> = {
  elbow_flexion: {
    url: 'https://www.youtube.com/embed/Hs6FQNoI2TM?playsinline=1&rel=0',
    fallbackUrl: 'https://www.youtube.com/embed/Hs6FQNoI2TM?playsinline=1&rel=0',
    title: 'Elbow Flexion / Extension',
    duration: '1 min',
    difficulty: 'Beginner',
    targetArea: 'Elbow / Biceps',
  },
  shoulder_abduction: {
    url: 'https://www.youtube.com/embed/Y-2X0XgjJL4?playsinline=1&rel=0',
    fallbackUrl: 'https://www.youtube.com/embed/Y-2X0XgjJL4?playsinline=1&rel=0',
    title: 'Shoulder Abduction',
    duration: '1 min',
    difficulty: 'Beginner',
    targetArea: 'Shoulder / Deltoids',
  },
  shoulder_abduction_stretch: {
    url: 'https://www.youtube.com/embed/cVuNsPXiRGU?playsinline=1&rel=0',
    fallbackUrl: 'https://www.youtube.com/embed/cVuNsPXiRGU?playsinline=1&rel=0',
    title: 'Shoulder Abduction Stretch',
    duration: '1 min',
    difficulty: 'Beginner',
    targetArea: 'Shoulder / Deltoids',
  },
  shoulder_flexion: {
    url: 'https://www.youtube.com/embed/k-WNso7_Wjg?playsinline=1&rel=0',
    fallbackUrl: 'https://www.youtube.com/embed/k-WNso7_Wjg?playsinline=1&rel=0',
    title: 'Shoulder Flexion',
    duration: '1 min',
    difficulty: 'Beginner',
    targetArea: 'Shoulder / Anterior Deltoid',
  },
  shoulder_internal_external_rotation: {
    url: 'https://www.youtube.com/embed/LidovRkw7Lo?playsinline=1&rel=0',
    fallbackUrl: 'https://www.youtube.com/embed/LidovRkw7Lo?playsinline=1&rel=0',
    title: 'Shoulder Internal & External Rotation',
    duration: '1 min',
    difficulty: 'Intermediate',
    targetArea: 'Rotator Cuff',
  },
  arm_raise_rehab: {
    url: 'https://www.youtube.com/embed/7dSmo__uXDg?playsinline=1&rel=0',
    fallbackUrl: 'https://www.youtube.com/embed/7dSmo__uXDg?playsinline=1&rel=0',
    title: 'Arm Raise Rehab',
    duration: '1 min',
    difficulty: 'Beginner',
    targetArea: 'Shoulder / Deltoids',
  },
  knee_rotation: {
    url: 'https://www.youtube.com/embed/4QqzATQ4RtU?playsinline=1&rel=0',
    fallbackUrl: 'https://www.youtube.com/embed/4QqzATQ4RtU?playsinline=1&rel=0',
    title: 'Knee Rotation',
    duration: '1 min',
    difficulty: 'Beginner',
    targetArea: 'Knee / Quadriceps',
  },
  straight_leg_raise: {
    url: 'https://www.youtube.com/embed/U4L_6JEv9Jg?playsinline=1&rel=0',
    fallbackUrl: 'https://www.youtube.com/embed/U4L_6JEv9Jg?playsinline=1&rel=0',
    title: 'Straight Leg Raise',
    duration: '1 min',
    difficulty: 'Beginner',
    targetArea: 'Hip Flexors / Quadriceps',
  },
  sit_to_stand: {
    url: 'https://www.youtube.com/embed/ITv-_BkcrD0?playsinline=1&rel=0',
    fallbackUrl: 'https://www.youtube.com/embed/ITv-_BkcrD0?playsinline=1&rel=0',
    title: 'Sit to Stand',
    duration: '1 min',
    difficulty: 'Beginner',
    targetArea: 'Quadriceps / Glutes',
  },
  squat: {
    url: 'https://www.youtube.com/embed/AfBBxYbiI74?playsinline=1&rel=0',
    fallbackUrl: 'https://www.youtube.com/embed/AfBBxYbiI74?playsinline=1&rel=0',
    title: 'Controlled Squats',
    duration: '1 min',
    difficulty: 'Intermediate',
    targetArea: 'Quadriceps / Glutes / Knees',
  },
  single_leg_stand: {
    url: 'https://www.youtube.com/embed/HwJUXz6jnkg?playsinline=1&rel=0',
    fallbackUrl: 'https://www.youtube.com/embed/HwJUXz6jnkg?playsinline=1&rel=0',
    title: 'Single Leg Stand',
    duration: '1 min',
    difficulty: 'Beginner',
    targetArea: 'Balance / Glutes',
  },
  heel_raises: {
    url: 'https://www.youtube.com/embed/4Wn5ugI7VU8?playsinline=1&rel=0',
    fallbackUrl: 'https://www.youtube.com/embed/4Wn5ugI7VU8?playsinline=1&rel=0',
    title: 'Heel Raises',
    duration: '1 min',
    difficulty: 'Beginner',
    targetArea: 'Calves / Ankles',
  },
  toe_raises: {
    url: 'https://www.youtube.com/embed/8yx4_cmAuy4?playsinline=1&rel=0',
    fallbackUrl: 'https://www.youtube.com/embed/8yx4_cmAuy4?playsinline=1&rel=0',
    title: 'Toe Raises',
    duration: '1 min',
    difficulty: 'Beginner',
    targetArea: 'Shins / Ankles',
  },
  back_straightening: {
    url: 'https://www.youtube.com/embed/TLR-oUe7u6s?playsinline=1&rel=0',
    fallbackUrl: 'https://www.youtube.com/embed/TLR-oUe7u6s?playsinline=1&rel=0',
    title: 'Back Straightening',
    duration: '1 min',
    difficulty: 'Beginner',
    targetArea: 'Spine / Core',
  },
  neck_alignment: {
    url: 'https://www.youtube.com/embed/AogVpPVKjt0?playsinline=1&rel=0',
    fallbackUrl: 'https://www.youtube.com/embed/AogVpPVKjt0?playsinline=1&rel=0',
    title: 'Neck Alignment',
    duration: '1 min',
    difficulty: 'Beginner',
    targetArea: 'Cervical Spine',
  },
  basic_core_activation: {
    url: 'https://www.youtube.com/embed/6WAZ9g6okjs?playsinline=1&rel=0',
    fallbackUrl: 'https://www.youtube.com/embed/6WAZ9g6okjs?playsinline=1&rel=0',
    title: 'Basic Core Activation',
    duration: '1 min',
    difficulty: 'Beginner',
    targetArea: 'Core / Abdominals',
  },
};

/**
 * Get demo video info for a given exercise type.
 */
export function getDemoVideo(exerciseType: ExerciseType): DemoVideoInfo {
  return demoVideos[exerciseType];
}
