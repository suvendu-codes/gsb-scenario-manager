/** Class groups for the OptionCards component. */
export const optionCardsStyles = {
  root: "flex flex-col gap-2",
  card: "relative flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-panel px-3 py-2.5 transition-colors hover:border-line-strong has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:disabled]:cursor-default has-[:disabled]:opacity-60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
  input: "peer sr-only",
  radio:
    "mt-0.5 flex size-4 flex-none items-center justify-center rounded-full border-[1.5px] border-line-strong bg-panel peer-checked:border-accent peer-checked:[&>span]:scale-100",
  radioDot: "size-2 scale-0 rounded-full bg-accent transition-transform",
  text: "min-w-0",
  label: "block text-[13px] font-medium text-ink",
  note: "block text-[11.5px] text-faint",
} as const;
