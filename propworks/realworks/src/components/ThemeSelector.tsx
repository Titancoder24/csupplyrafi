"use client";

import { useTheme, themes } from "./ThemeProvider";
import { Check } from "lucide-react";

export default function ThemeSelector() {
  const { activeTheme, setTheme } = useTheme();

  return (
    <div className="space-y-3">
      <div className="text-kicker">Workspace Accent</div>
      <div className="grid max-w-[140px] grid-cols-1 gap-3">
        {themes.map((theme) => {
          const isActive = activeTheme.name === theme.name;
          return (
            <button
              key={theme.name}
              type="button"
              onClick={() => setTheme(theme.name)}
              className={`flex h-10 w-full items-center justify-center rounded-md transition-all ${isActive ? "ring-2 ring-primary/30 shadow-sm" : "border border-border/50 hover:shadow-sm"}`}
              style={{ backgroundColor: theme.value, color: theme.foreground }}
              title={theme.name}
            >
              {isActive && <Check className="h-5 w-5" />}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] font-medium text-muted-foreground">
        Active accent: <span className="font-bold text-foreground">{activeTheme.name}</span>
      </p>
    </div>
  );
}
