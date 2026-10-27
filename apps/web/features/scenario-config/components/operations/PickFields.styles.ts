/** Class groups for the PickFields component. */
export const pickFieldsStyles = {
  root: "flex flex-col gap-3",
  group: "rounded-lg border border-line bg-panel",
  summary:
    "flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-[13px] font-semibold text-ink focus-visible:outline-2 focus-visible:outline-accent",
  changedTag:
    "rounded-full border border-accent-line bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent",
  fields: "flex flex-col gap-5 border-t border-line px-3 py-4",
} as const;
