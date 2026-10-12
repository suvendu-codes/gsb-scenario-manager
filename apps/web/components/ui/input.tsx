import * as React from "react";

import { cn } from "@/lib/utils";

export function Input({
  className,
  type = "text",
  ...props
}: React.ComponentProps<"input">): React.JSX.Element {
  return (
    <input
      type={type}
      className={cn(
        "h-[46px] w-full rounded-xl border border-line-strong bg-panel px-3.5 text-[15px] text-ink placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-invalid:border-danger disabled:cursor-not-allowed disabled:bg-paper disabled:text-faint",
        className,
      )}
      {...props}
    />
  );
}
