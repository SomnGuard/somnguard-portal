import type { ThemeName } from './ThemeContext';

function shield(fill: string, stroke: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 112">` +
    `<path d="M50 5 L88 19 L88 55 C88 79 70 97 50 107 C30 97 12 79 12 55 L12 19 Z" fill="${fill}" stroke="${stroke}" stroke-width="7" stroke-linejoin="round"/>` +
    `<rect x="26" y="38" width="48" height="24" rx="12" fill="none" stroke="${stroke}" stroke-width="5.5"/>` +
    `<circle cx="50" cy="50" r="10" fill="${stroke}"/>` +
    `<path d="M41 73 Q50 78 59 73" stroke="${stroke}" stroke-width="4.5" stroke-linecap="round" fill="none"/>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const FAVICONS: Record<ThemeName, string> = {
  dark: shield('#0c1b2e', '#00c8c8'),
  light: shield('#ffffff', '#00787f'),
};

/** Cambia el favicon según el tema (el .svg estático queda como fallback). */
export function applyFavicon(theme: ThemeName): void {
  try {
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/svg+xml';
      document.head.appendChild(link);
    }
    link.href = FAVICONS[theme];
  } catch { /* noop */ }
}
