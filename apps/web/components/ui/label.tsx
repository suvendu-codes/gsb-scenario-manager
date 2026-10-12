import * as React from "react";

import { cn } from "@/lib/utils";

export function Label({
  className,
  ...props
}: React.ComponentProps<"label">): React.JSX.Element {
  return (
    <label
      className={cn("mb-2 block text-[13.5px] font-medium text-ink", className)}
      {...props}
    />
  );
}
