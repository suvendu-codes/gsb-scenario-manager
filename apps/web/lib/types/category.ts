export interface ParetoBand {
    skuPct: number;
    orderPct: number;
    inventoryPct: number;
}

export interface CategoryProfile {
    id: string;
    name: string;
    avgOlPerOrder: number;
    minOlCount: number;
    maxOlCount: number;
    minQtyPerOl: number;
    maxQtyPerOl: number;
    avgUnitsPerOrder: number;
    singleLineOrdersPct: number;
    olInWave: number;
    wavesPerDay: number;
    waveIntervalS: number;
    orderPoolSize: number;
    flatShape: boolean;
    paretoBands: ParetoBand[];
}

export type CategoryNumberFieldKey = keyof Omit<CategoryProfile, "id" | "name" | "flatShape" | "paretoBands">;

export interface CategoryNumberFieldConfig {
    key: CategoryNumberFieldKey;
    label: string;
    suffix?: string;
}

export interface CategoriesProps {
    categories?: CategoryProfile[];
    onChange?: (categories: CategoryProfile[]) => void;
}

export interface ParentSkuProps {
    paretoBands: ParetoBand[];
    onUpdateBand: (index: number, field: keyof ParetoBand, value: string) => void;
    onAddBand: () => void;
    onRemoveBand: (index: number) => void;
}