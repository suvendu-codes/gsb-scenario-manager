/** The hours of a day, 0 to 24, as "00:00" to "24:00". */
export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/** Hours the window can start at: from midnight up to one hour before it ends. */
export function startHourOptions(endHour: number): number[] {
  return Array.from({ length: endHour }, (_, hour) => hour);
}

/** Hours the window can end at: from one hour after it starts up to the end of the day. */
export function endHourOptions(startHour: number): number[] {
  return Array.from({ length: 24 - startHour }, (_, i) => startHour + 1 + i);
}
