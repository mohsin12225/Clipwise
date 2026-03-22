/**
 * YouTube URL validation and parsing utilities.
 * Supports all common YouTube URL formats.
 */

const YOUTUBE_PATTERNS = [
  // Standard watch URLs
  /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  // Shortened URLs
  /^(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
  // Embed URLs
  /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  // Shorts URLs
  /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  // Live URLs
  /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
  // Mobile URLs
  /^(?:https?:\/\/)?m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
];

/**
 * Extracts the YouTube video ID from a URL.
 * Returns null if the URL is not a valid YouTube URL.
 */
export function extractYoutubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  for (const pattern of YOUTUBE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Validates whether a string is a valid YouTube URL.
 */
export function isValidYoutubeUrl(url: string): boolean {
  return extractYoutubeVideoId(url) !== null;
}

/**
 * Generates a YouTube thumbnail URL from a video ID.
 * Quality options: 'default', 'mq', 'hq', 'sd', 'maxres'
 */
export function getYoutubeThumbnailUrl(
  videoId: string,
  quality: 'default' | 'mq' | 'hq' | 'sd' | 'maxres' = 'hq'
): string {
  const qualityMap = {
    default: 'default',
    mq: 'mqdefault',
    hq: 'hqdefault',
    sd: 'sddefault',
    maxres: 'maxresdefault',
  };

  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

/**
 * Generates a YouTube embed URL from a video ID.
 */
export function getYoutubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Generates a clean YouTube watch URL from a video ID.
 */
export function getYoutubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Returns a validation result object for form use.
 */
export function validateYoutubeUrl(url: string): {
  isValid: boolean;
  videoId: string | null;
  error: string | null;
} {
  const trimmed = url.trim();

  if (!trimmed) {
    return { isValid: false, videoId: null, error: null };
  }

  // Check if it looks like a URL at all
  if (!trimmed.includes('youtube') && !trimmed.includes('youtu.be')) {
    return {
      isValid: false,
      videoId: null,
      error: 'Please enter a valid YouTube URL',
    };
  }

  const videoId = extractYoutubeVideoId(trimmed);

  if (!videoId) {
    return {
      isValid: false,
      videoId: null,
      error: 'Could not extract video ID. Please check the URL.',
    };
  }

  return { isValid: true, videoId, error: null };
}