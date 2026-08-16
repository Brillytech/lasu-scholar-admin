import { useEffect, useState } from "react";

/**
 * Tracks whether the app is currently in dark mode by watching the "dark"
 * class on <html> (toggled by useTheme).
 */
export function useIsDarkMode() {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains("dark"));
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

export type SelectColors = {
  backgroundColor: string;
  color: string;
  colorScheme: "dark" | "light";
};

/**
 * Inline styles for native <select> / <option> elements.
 *
 * Chrome does not reliably honour the CSS `color-scheme` property for the
 * <option> popup list, so the colors have to be set explicitly inline on both
 * the <select> and each <option> inside it.
 */
export function useSelectColors(): SelectColors {
  const isDark = useIsDarkMode();

  return isDark
    ? { backgroundColor: "#0b1626", color: "#f8fafc", colorScheme: "dark" }
    : { backgroundColor: "#ffffff", color: "#07101f", colorScheme: "light" };
}

export default useIsDarkMode;
