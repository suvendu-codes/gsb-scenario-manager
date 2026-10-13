import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Joins class names and resolves Tailwind conflicts, so the last class wins
 * (for example `cn("px-2", "px-4")` returns `"px-4"`).
 *
 * @param inputs - Class names, arrays, or `{ className: condition }` objects.
 * @returns A single class string.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
