import { logger } from './logger';

/**
 * Platform type definition
 */
export type Platform = 'niconico' | 'youtube' | 'spotify' | 'appleMusic' | null;

/**
 * Video ID detection result
 */
export interface PlatformDetectionResult {
  platform: Platform;
  isValid: boolean;
  confidence: number; // 0-1, confidence in the detection
}

/**
 * Automatically detect platform based on video ID pattern
 * This function analyzes video ID formats to determine the most likely platform
 */
export function detectPlatformFromVideoId(videoId: string): PlatformDetectionResult {
  if (!videoId || typeof videoId !== 'string') {
    return { platform: null, isValid: false, confidence: 0 };
  }

  const id = videoId.trim();

  // Niconico video ID pattern: sm followed by 1-8 digits
  if (/^sm\d{1,8}$/.test(id)) {
    return { platform: 'niconico', isValid: true, confidence: 0.95 };
  }

  // YouTube video ID pattern: exactly 11 characters, alphanumeric + underscore + hyphen
  if (/^[a-zA-Z0-9_-]{11}$/.test(id)) {
    return { platform: 'youtube', isValid: true, confidence: 0.90 };
  }

  // Spotify track ID pattern: exactly 22 characters, alphanumeric
  if (/^[a-zA-Z0-9]{22}$/.test(id)) {
    return { platform: 'spotify', isValid: true, confidence: 0.85 };
  }

  // Apple Music ID pattern: numeric only, 1-10 digits
  if (/^\d{1,10}$/.test(id)) {
    return { platform: 'appleMusic', isValid: true, confidence: 0.80 };
  }

  // No pattern matched
  logger.warn('Could not detect platform for video ID:', id);
  return { platform: null, isValid: false, confidence: 0 };
}

/**
 * Validate video ID format for a specific platform
 */
export function validateVideoIdForPlatform(videoId: string, platform: Platform): boolean {
  if (!videoId || !platform) return false;

  switch (platform) {
    case 'niconico':
      return /^sm\d{1,8}$/.test(videoId);
    case 'youtube':
      return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
    case 'spotify':
      return /^[a-zA-Z0-9]{22}$/.test(videoId);
    case 'appleMusic':
      return /^\d{1,10}$/.test(videoId);
    default:
      return false;
  }
}

/**
 * Auto-correct platform based on video ID if there's a mismatch
 * Returns the corrected platform and a flag indicating if correction was made
 */
export function autoCorrectPlatform(videoId: string, declaredPlatform: Platform): {
  correctedPlatform: Platform;
  wasCorrected: boolean;
  confidence: number;
} {
  const detection = detectPlatformFromVideoId(videoId);
  
  // If detected platform is different from declared and has high confidence
  if (detection.platform !== declaredPlatform && detection.confidence > 0.8) {
    logger.warn(`Platform mismatch detected: declared="${declaredPlatform}", detected="${detection.platform}" for videoId="${videoId}"`);
    return {
      correctedPlatform: detection.platform,
      wasCorrected: true,
      confidence: detection.confidence
    };
  }

  // If declared platform is valid for the video ID, keep it
  if (declaredPlatform && validateVideoIdForPlatform(videoId, declaredPlatform)) {
    return {
      correctedPlatform: declaredPlatform,
      wasCorrected: false,
      confidence: 1.0
    };
  }

  // Otherwise, use the detected platform
  return {
    correctedPlatform: detection.platform,
    wasCorrected: detection.platform !== declaredPlatform,
    confidence: detection.confidence
  };
}