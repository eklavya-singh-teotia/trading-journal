import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("ij-theme") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ij-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

/** Resolved colors for Chart.js (canvas cannot read CSS variables). */
export const useChartTheme = () => {
  const { theme } = useTheme() ?? { theme: "light" };
  const isDark = theme === "dark";

  return {
    theme,
    isDark,
    textPrimary: isDark ? "#f1f5f9" : "#0f172a",
    textSecondary: isDark ? "#94a3b8" : "#475569",
    gridColor: isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.12)",
    axisColor: isDark ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.2)",
    tooltipBg: isDark ? "#182238" : "#ffffff",
    tooltipBorder: isDark ? "#253350" : "#e2e8f0",
    profitColor: isDark ? "#10b981" : "#059669",
    lossColor: isDark ? "#f43f5e" : "#e11d48",
  };
};
