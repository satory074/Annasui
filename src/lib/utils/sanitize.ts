/**
 * Input sanitization utilities for XSS protection
 * 
 * This module provides safe input sanitization functions to prevent
 * Cross-Site Scripting (XSS) attacks by cleaning user-generated content.
 */

/**
 * Sanitizes text input by removing potentially dangerous characters
 * while preserving common text formatting
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data: protocol (can be used for XSS)
    .replace(/data:/gi, '')
    // Remove vbscript: protocol
    .replace(/vbscript:/gi, '')
    // Remove on* event handlers
    .replace(/on\w+\s*=/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitizes song title input with music-specific considerations
 */
export function sanitizeSongTitle(title: string): string {
  if (!title || typeof title !== 'string') {
    return '';
  }

  return sanitizeText(title)
    // Preserve common music notation
    .replace(/&amp;/g, '&')
    // Limit length to reasonable size
    .substring(0, 200);
}

/**
 * Sanitizes artist name input
 */
export function sanitizeArtistName(artist: string): string {
  if (!artist || typeof artist !== 'string') {
    return '';
  }

  return sanitizeText(artist)
    // Preserve common artist name formats
    .replace(/&amp;/g, '&')
    // Limit length to reasonable size
    .substring(0, 100);
}

/**
 * Sanitizes URL input and validates format
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Remove dangerous protocols and content
  const cleaned = url
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .trim();

  // Only allow HTTP(S) and common video platforms
  const allowedProtocols = /^https?:\/\//i;
  const allowedDomains = [
    'nicovideo.jp',
    'youtube.com', 
    'youtu.be',
    'spotify.com',
    'music.apple.com'
  ];

  try {
    const urlObj = new URL(cleaned);
    
    // Check protocol
    if (!allowedProtocols.test(cleaned)) {
      return '';
    }

    // Check domain for platform URLs
    const domain = urlObj.hostname.toLowerCase();
    const isAllowedDomain = allowedDomains.some(allowed => 
      domain.includes(allowed)
    );

    if (!isAllowedDomain) {
      return '';
    }

    return cleaned.substring(0, 500); // Limit URL length
  } catch {
    return '';
  }
}

/**
 * Sanitizes user input for medley creator/title fields
 */
export function sanitizeMedleyField(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return sanitizeText(input)
    .substring(0, 150); // Reasonable limit for medley fields
}

/**
 * Validates and sanitizes time input (for song timing)
 */
export function sanitizeTimeInput(time: number | string): number {
  if (typeof time === 'string') {
    time = parseFloat(time);
  }

  if (isNaN(time) || !isFinite(time)) {
    return 0;
  }

  // Clamp to reasonable bounds (0 to 24 hours)
  return Math.max(0, Math.min(time, 86400));
}

/**
 * Comprehensive sanitization for song section data
 */
export function sanitizeSongSection(song: {
  title?: string;
  artist?: string;
  startTime?: number | string;
  endTime?: number | string;
  niconicoLink?: string;
  youtubeLink?: string;
  spotifyLink?: string;
  applemusicLink?: string;
  color?: string;
}): {
  title: string;
  artist: string;
  startTime: number;
  endTime: number;
  niconicoLink?: string;
  youtubeLink?: string;
  spotifyLink?: string;
  applemusicLink?: string;
  color?: string;
} {
  const sanitized = {
    title: sanitizeSongTitle(song.title || ''),
    artist: sanitizeArtistName(song.artist || ''),
    startTime: sanitizeTimeInput(song.startTime || 0),
    endTime: sanitizeTimeInput(song.endTime || 0),
  };

  // Optional fields
  const result: typeof sanitized & {
    niconicoLink?: string;
    youtubeLink?: string;
    spotifyLink?: string;
    applemusicLink?: string;
    color?: string;
  } = sanitized;

  // Sanitize platform-specific links
  if (song.niconicoLink) {
    const sanitizedUrl = sanitizeUrl(song.niconicoLink);
    if (sanitizedUrl) {
      result.niconicoLink = sanitizedUrl;
    }
  }

  if (song.youtubeLink) {
    const sanitizedUrl = sanitizeUrl(song.youtubeLink);
    if (sanitizedUrl) {
      result.youtubeLink = sanitizedUrl;
    }
  }

  if (song.spotifyLink) {
    const sanitizedUrl = sanitizeUrl(song.spotifyLink);
    if (sanitizedUrl) {
      result.spotifyLink = sanitizedUrl;
    }
  }

  if (song.applemusicLink) {
    const sanitizedUrl = sanitizeUrl(song.applemusicLink);
    if (sanitizedUrl) {
      result.applemusicLink = sanitizedUrl;
    }
  }

  if (song.color && typeof song.color === 'string') {
    // Only allow valid CSS color formats
    const colorPattern = /^#[0-9a-fA-F]{6}$|^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$|^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/;
    if (colorPattern.test(song.color.trim())) {
      result.color = song.color.trim();
    }
  }

  return result;
}