import type { CategoryProfile } from "./types";

export function makeCategory(name: string): CategoryProfile {
    return {
        id: `${name}-${Date.now()}`,
        name,
        avgOlPerOrder: 1,
        minOlCount: 1,
        maxOlCount: 1,
        minQtyPerOl: 1,
        maxQtyPerOl: 1,
        avgUnitsPerOrder: 1,
        singleLineOrdersPct: 0,
        olInWave: 100,
        wavesPerDay: 100,
        waveIntervalS: 1500,
        orderPoolSize: 0,
        flatShape: false,
        paretoBands: [{ skuPct: 20, orderPct: 80, inventoryPct: 30 }],
    };
}