
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const DarkModeToggle = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // Prevent hydration mismatch

  const isDark = resolvedTheme === "dark";

  return (
    <button
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="flex items-center gap-2 px-2 py-1 rounded-lg border border-transparent hover:shadow transition bg-muted/60 hover:bg-muted/80 dark:bg-background/90 dark:hover:bg-muted/30"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      type="button"
      tabIndex={0}
    >
      <span className="sr-only">
        {isDark ? "Switch to light mode" : "Switch to dark mode"}
      </span>
      {isDark ? (
        <Sun className="w-5 h-5 text-yellow-400" />
      ) : (
        <Moon className="w-5 h-5 text-purple-700" />
      )}
      <span className="text-xs font-medium text-muted-foreground">
        {isDark ? "Light" : "Dark"}
      </span>
    </button>
  );
};

export default DarkModeToggle;
