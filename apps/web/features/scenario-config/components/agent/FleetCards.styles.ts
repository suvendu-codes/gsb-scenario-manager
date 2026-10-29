/** Class groups for the FleetCards component. */
export const fleetCardsStyles = {
  grid: "grid grid-cols-2 gap-3",
  card: "flex flex-col overflow-hidden rounded-lg border border-line bg-panel",
  imageWrap: "flex aspect-[16/10] w-full items-center justify-center bg-paper",
  image: "size-full object-contain",
  body: "flex flex-col gap-2 px-3 py-3",
  stepperWrap: "flex justify-center",
  total: "mt-3 text-[12px] text-faint",
} as const;
