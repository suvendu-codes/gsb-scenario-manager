import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

import { selectStyles } from "./select.styles";

/**
 * Dropdown built on a native `<select>`, which keeps keyboard and mobile
 * behaviour for free. Pass `<option>` elements as children.
 *
 * @param className - Extra classes for the `<select>`, merged over the defaults.
 */
export function Select({
  className,
  children,
  ...props
}: React.ComponentProps<"select">): React.JSX.Element {
  return (
    <div className={selectStyles.wrapper}>
      <select className={cn(selectStyles.root, className)} {...props}>
        {children}
      </select>
      <ChevronDown aria-hidden="true" className={selectStyles.chevron} />
    </div>
  );
}
