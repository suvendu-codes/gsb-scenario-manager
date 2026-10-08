export const pick = <T>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)];

export const int = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const pastDate = (maxDaysAgo = 30): string =>
  new Date(Date.now() - int(0, maxDaysAgo * 86_400_000)).toISOString();
