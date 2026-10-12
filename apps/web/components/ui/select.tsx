import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

// Native <select> keeps keyboard and mobile behaviour for free.
export function Select({
  className,
  children,
  ...props
}: React.ComponentProps<"select">): React.JSX.Element {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-[46px] w-full cursor-pointer appearance-none rounded-xl border border-line-strong bg-panel pl-3.5 pr-10 text-[15px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-paper disabled:text-faint",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3.5 top-1/2 size-3.5 -translate-y-1/2 text-faint"
      />
    </div>
  );
}
