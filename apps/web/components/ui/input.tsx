import * as React from "react";

import { cn } from "@/lib/utils";

import { inputStyles } from "./input.styles";

/**
 * Single-line text input.
 * Set `aria-invalid` to show the error border.
 *
 * @param type - Input type, defaults to `"text"`.
 * @param className - Extra classes, merged over the default styles.
 */
export function Input({
  className,
  type = "text",
  ...props
}: React.ComponentProps<"input">): React.JSX.Element {
  return <input type={type} className={cn(inputStyles.root, className)} {...props} />;
}
