import * as React from "react";

import { cn } from "@/lib/utils";

import { labelStyles } from "./label.styles";

/**
 * Form field label. Pair it with `htmlFor` and the control's `id`.
 *
 * @param className - Extra classes, merged over the default styles.
 */
export function Label({ className, ...props }: React.ComponentProps<"label">): React.JSX.Element {
  return <label className={cn(labelStyles.root, className)} {...props} />;
}
