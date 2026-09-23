import { setThemePreference, useTheme } from '../lib/theme';

export function ThemeToggle() {
  const theme = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      className="theme-toggle icon-button"
      aria-label={next === 'dark' ? 'Dunkelmodus aktivieren' : 'Hellmodus aktivieren'}
      title={next === 'dark' ? 'Dunkelmodus aktivieren' : 'Hellmodus aktivieren'}
      onClick={() => setThemePreference(next)}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {theme === 'dark' ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5" />
          </>
        ) : (
          <path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z" />
        )}
      </svg>
      <span>{next === 'dark' ? 'Dunkel' : 'Hell'}</span>
    </button>
  );
}
