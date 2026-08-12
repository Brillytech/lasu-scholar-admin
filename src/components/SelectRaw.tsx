import { useEffect, useState } from "react";

type SelectRawProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
};

function useIsDarkMode() {
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

export default function SelectRaw({
  label,
  value,
  onChange,
  options,
}: SelectRawProps) {
  const isDark = useIsDarkMode();

  const selectColors = isDark
    ? { backgroundColor: "#0b1626", color: "#f8fafc", colorScheme: "dark" as const }
    : { backgroundColor: "#ffffff", color: "#07101f", colorScheme: "light" as const };

  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={selectColors}
        className="h-12 w-full rounded-2xl border border-orange/10 bg-soft px-4 text-sm font-bold text-navy outline-none transition focus:border-orange dark:border-white/10 dark:bg-white/10 dark:text-white"
      >
        {options.map((item) => (
          <option key={item || "placeholder"} value={item} style={selectColors}>
            {item || `Select ${label}`}
          </option>
        ))}
      </select>
    </label>
  );
}
