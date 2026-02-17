"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/providers/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 border border-white/20 text-white transition-all duration-200 hover:bg-white/20 hover:scale-105 mr-3"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-ng-yellow" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
