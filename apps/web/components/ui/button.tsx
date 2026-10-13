import * as React from "react";
import { type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

import { buttonVariants } from "./button.styles";

type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

/**
 * Primary action control.
 *
 * @param variant - Visual style: `primary` (default), `ghost` or `danger`.
 * @param size - `default`, `sm` or `lg`.
 * @param type - Defaults to `"button"` so it never submits a form by accident.
 * @param className - Extra classes, merged over the variant classes.
 */
export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps): React.JSX.Element {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}

export { buttonVariants };
