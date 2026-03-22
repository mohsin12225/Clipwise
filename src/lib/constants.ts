export const APP_NAME = 'ClipWise';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const THEME_STORAGE_KEY = 'clipwise-theme';

export const MAX_FILE_SIZE_MB = 500;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const SUPPORTED_VIDEO_FORMATS = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm',
];

export const SUPPORTED_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'Squares2X2Icon' },
  { label: 'Upload', href: '/upload', icon: 'CloudArrowUpIcon' },
] as const;

export const SIDEBAR_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'Squares2X2Icon' },
  { label: 'Projects', href: '/dashboard', icon: 'FolderIcon' },
  { label: 'Upload', href: '/upload', icon: 'CloudArrowUpIcon' },
  { label: 'Settings', href: '#', icon: 'Cog6ToothIcon' },
] as const;

/**
 * Resolves a backend storage URL to a full absolute URL.
 * Backend returns paths like "/storage/clips/proj_xxx/clip_xxx.mp4"
 * This prepends the backend base URL to make them loadable.
 */
export function resolveStorageUrl(path: string): string {
  if (!path) return '';

  // Already a full URL
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // YouTube thumbnail URL (starts with //)
  if (path.startsWith('//')) {
    return `https:${path}`;
  }

  // Relative path from backend — prepend base URL
  const cleanBase = API_BASE_URL.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return `${cleanBase}${cleanPath}`;
}