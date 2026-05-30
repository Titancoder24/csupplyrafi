"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeColor = {
  name: string;
  value: string;
  foreground: string;
};

export const themes: ThemeColor[] = [
  { name: "Realworks Premium Blue", value: "#1868F2", foreground: "#ffffff" },
];

interface ThemeContextType {
  activeTheme: ThemeColor;
  setTheme: (themeName: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [activeTheme, setActiveTheme] = useState<ThemeColor>(() => {
    if (typeof window === "undefined") return themes[0];
    const saved = window.localStorage.getItem("realworks-theme");
    return themes.find((theme) => theme.name === saved) || themes[0];
  });

  useEffect(() => {
    document.documentElement.style.setProperty("--primary", activeTheme.value);
    document.documentElement.style.setProperty("--primary-foreground", activeTheme.foreground);
    document.documentElement.style.setProperty("--ring", activeTheme.value);
  }, [activeTheme]);

  const setTheme = (name: string) => {
    const found = themes.find(t => t.name === name);
    if (found) {
      setActiveTheme(found);
      window.localStorage.setItem("realworks-theme", name);
    }
  };

  return (
    <ThemeContext.Provider value={{ activeTheme, setTheme }}>
      {/* We use a wrapper div with style injection as a fallback to ensure colors propagate if root overrides fail */}
      <div style={{ 
        "--primary": activeTheme.value, 
        "--primary-foreground": activeTheme.foreground,
        "--ring": activeTheme.value
      } as React.CSSProperties} className="contents">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
