import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isLight}
      aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
      onClick={toggle}
      className="relative flex h-9 w-[74px] shrink-0 items-center rounded-full border border-border bg-surface px-1 transition-colors"
    >
      <span
        className={cn(
          "absolute top-1 h-7 w-[34px] rounded-full bg-primary transition-transform duration-300",
          isLight ? "translate-x-[32px]" : "translate-x-0",
        )}
      />
      <span className="relative z-10 grid w-1/2 place-items-center">
        <Moon
          className={cn(
            "h-4 w-4 transition-colors",
            isLight ? "text-muted-foreground" : "text-primary-foreground",
          )}
        />
      </span>
      <span className="relative z-10 grid w-1/2 place-items-center">
        <Sun
          className={cn(
            "h-4 w-4 transition-colors",
            isLight ? "text-primary-foreground" : "text-muted-foreground",
          )}
        />
      </span>
    </button>
  );
}
