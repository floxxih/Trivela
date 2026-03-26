import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Landing from './Landing';
import CampaignDetail from './CampaignDetail';
import { applyTheme, getPreferredTheme, THEME_STORAGE_KEY } from './theme';

export default function App() {
  const [theme, setTheme] = useState(() => getPreferredTheme());

  useEffect(() => {
    applyTheme(theme);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Landing
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        }
      />
      <Route
        path="/campaign/:id"
        element={
          <CampaignDetail
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        }
      />
    </Routes>
  );
}
