/** Class groups for the Dialog components. Edit here to restyle every modal. */
export const dialogStyles = {
  overlay: "fixed inset-0 z-100 bg-ink/50",
  content:
    "fixed left-1/2 top-1/2 z-100 flex max-h-[calc(100vh-48px)] w-[calc(100%-48px)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[20px] bg-panel shadow-[0_20px_60px_rgba(0,0,0,.25)]",
  close:
    "absolute right-5 top-5 flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-paper-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent",
  closeIcon: "size-4",
  header: "px-7 pr-14 pt-[26px]",
  title: "text-2xl font-bold tracking-tight text-ink",
  description: "mt-1 text-sm leading-snug text-muted",
  body: "flex flex-col gap-5 overflow-y-auto px-7 pb-2.5 pt-[22px]",
  footer: "flex items-center justify-between gap-3 px-7 pb-[26px] pt-[18px]",
} as const;
