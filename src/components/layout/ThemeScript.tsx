import { THEME_STORAGE_KEY } from '@/lib/constants';

/**
 * Inline script that runs before React hydration to set the correct
 * theme class on <html>. This prevents the flash of unstyled content
 * (FOUC) that happens when the theme is applied client-side only.
 *
 * This component renders a <script> tag with an IIFE that:
 * 1. Reads the stored theme from localStorage
 * 2. Falls back to system preference
 * 3. Applies the 'dark' class if needed
 * 4. Adds 'theme-loading' class to suppress transitions during initial paint
 */
export function ThemeScript() {
  const script = `
    (function() {
      try {
        var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        var theme = stored || (prefersDark ? 'dark' : 'light');
        var root = document.documentElement;
        root.classList.add('theme-loading');
        if (theme === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      } catch (e) {}
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}