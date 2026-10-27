/** Class groups for the ConfigSections component. */
export const configSectionsStyles = {
  root: "flex flex-col",
  section: "flex flex-col gap-4 border-t border-line px-5 py-5 first:border-t-0",
  title: "text-[14px] font-semibold text-ink",
  description: "-mt-2 text-[12px] leading-snug text-faint",
  fields: "flex flex-col gap-5",
} as const;
