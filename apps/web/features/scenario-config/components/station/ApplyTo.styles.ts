/** Class groups for the ApplyTo component. */
export const applyToStyles = {
  root: "rounded-lg border border-line bg-paper px-3 py-2.5",
  summary:
    "flex cursor-pointer items-center justify-between gap-3 text-[12.5px] focus-visible:outline-2 focus-visible:outline-accent",
  label: "text-muted",
  value: "font-medium text-ink",
  body: "mt-3 flex flex-col gap-2",
  hint: "text-[11.5px] leading-snug text-faint",
} as const;
