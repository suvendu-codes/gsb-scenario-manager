import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-white shadow-[0_1px_2px_rgba(232,91,49,.25)] hover:bg-accent-hover disabled:bg-accent-disabled disabled:shadow-none",
        ghost:
          "border border-line-strong bg-panel text-ink hover:bg-paper disabled:text-faint",
        danger: "bg-danger text-white hover:bg-danger-hover disabled:opacity-60",
      },
      size: {
        default: "px-[18px] py-2.5 text-[13.5px]",
        sm: "px-4 py-2 text-[13px]",
        lg: "rounded-xl px-5 py-3 text-sm",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps): React.JSX.Element {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
