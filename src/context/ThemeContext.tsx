import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // Force light theme and override any system preferences
    setTheme('light');
    document.documentElement.setAttribute('data-bs-theme', 'light');
    localStorage.setItem('app-theme', 'light');
  }, []);

  const toggleTheme = () => {
    // Keep theme as light only
    setTheme('light');
    document.documentElement.setAttribute('data-bs-theme', 'light');
    localStorage.setItem('app-theme', 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
