import { useEffect, useState } from 'react';
import Landing from './Landing';
import { applyTheme, getPreferredTheme, THEME_STORAGE_KEY } from './theme';

export default function App() {
  const [theme, setTheme] = useState(() => getPreferredTheme());

  useEffect(() => {
    applyTheme(theme);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme]);

  return (
    <Landing
      theme={theme}
      onToggleTheme={() => {
        setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
      }}
    />
  );
}
