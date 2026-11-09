
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import "./ThemeToggle.css";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={`theme-toggle ${isDark ? "dark" : "light"}`}
      onClick={toggleTheme}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-pressed={isDark}
    >
      <span className="theme-toggle-icon" key={theme}>
        {isDark ? (
          <Moon size={20} strokeWidth={2.2} />
        ) : (
          <Sun size={20} strokeWidth={2.2} />
        )}
      </span>
    </button>
  );
}
