"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CategoryProfile, ParetoBand, CategoriesProps } from "@/lib/types";
import NumberField from "../../shared/NumberField";
import { DEFAULT_CATEGORIES, CATEGORY_NUMBER_FIELDS } from "@/lib/data";
import ParentSku from "./ParentSku";
import { useApi } from "@/lib/hooks/useApi";



function makeCategory(name: string): CategoryProfile {
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

export function Categories({
    categories: controlledCategories,
    onChange,
}: CategoriesProps = {}) {
    const [internalCategories, setInternalCategories] = useState<CategoryProfile[]>(DEFAULT_CATEGORIES);
    const categories = controlledCategories ?? internalCategories;
    const [activeCategoryId, setActiveCategoryId] = useState("category2");
    const { request } = useApi<{ success: boolean; categories: CategoryProfile[] }>();

    function updateCategories(updater: (prev: CategoryProfile[]) => CategoryProfile[]) {
        const next = updater(categories);
        if (onChange) {
            onChange(next);
        } else {
            setInternalCategories(next);
        }
        request({
            method: "POST",
            url: "/api/categories",
            data: next,
        }).catch(() => undefined);
    }

    function addCategory() {
        const category = makeCategory(`category${categories.length + 1}`);
        // updateCategories((prev) => [...prev, category]);
        setActiveCategoryId(category.id);
    }
    function updateActiveCategory(patch: Partial<CategoryProfile>) {
        updateCategories((prev) =>
            prev.map((c) => (c.id === activeCategoryId ? { ...c, ...patch } : c))
        );
    }
    function removeCategory(id: string) {
        const remaining = categories.filter((c) => c.id !== id);
        if (remaining.length === 0) return;
        // updateCategories(() => remaining);
        if (activeCategoryId === id) setActiveCategoryId(remaining[0].id);
    }
    const activeCategory = categories.find((c) => c.id === activeCategoryId) ?? categories[0];
    function updateBand(index: number, field: keyof ParetoBand, value: string) {
        updateCategories((prev) =>
            prev.map((c) =>
                c.id === activeCategoryId
                    ? {
                        ...c,
                        paretoBands: c.paretoBands.map((band, i) =>
                            i === index ? { ...band, [field]: Number(value) || 0 } : band
                        ),
                    }
                    : c
            )
        );
    }

    function addBand() {
        updateCategories((prev) =>
            prev.map((c) =>
                c.id === activeCategoryId
                    ? { ...c, paretoBands: [...c.paretoBands, { skuPct: 0, orderPct: 0, inventoryPct: 0 }] }
                    : c
            )
        );
    }

    function removeBand(index: number) {
        updateCategories((prev) =>
            prev.map((c) =>
                c.id === activeCategoryId
                    ? { ...c, paretoBands: c.paretoBands.filter((_, i) => i !== index) }
                    : c
            )
        );
    }
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-2">
                {categories.map((cat) => (
                    <div
                        key={cat.id}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[14px] font-medium transition-colors ${cat.id === activeCategoryId
                            ? "border-[var(--st-amber)] bg-white/[0.04] text-white"
                            : "border-white/10 bg-white/[0.03] text-white/70 hover:text-white"
                            }`}
                    >
                        <button
                            type="button"
                            onClick={() => setActiveCategoryId(cat.id)}
                            className="outline-none"
                        >
                            {cat.name}
                        </button>
                        {categories.length > 1 && (
                            <button
                                type="button"
                                aria-label={`Remove ${cat.name}`}
                                onClick={() => removeCategory(cat.id)}
                                className="text-white/40 hover:text-white"
                            >
                                &times;
                            </button>
                        )}
                    </div>
                ))}
                <button
                    type="button"
                    onClick={addCategory}
                    className="rounded-lg border border-dashed border-white/20 bg-transparent px-3 py-2 text-[14px] text-white/60 hover:text-white"
                >
                    + add category
                </button>
            </div>

            <div>
                <label className="text-[11px] font-semibold tracking-widest text-white/40">
                    CATEGORY NAME
                </label>
                <Input
                    value={activeCategory.name}
                    onChange={(e) => updateActiveCategory({ name: e.target.value })}
                    className="mt-2 h-11 w-full sm:max-w-md border-white/10 bg-white/[0.02] text-[15px] text-white"
                />
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                    {CATEGORY_NUMBER_FIELDS.map((field) => (
                        <NumberField
                            key={field.key}
                            label={field.label}
                            value={activeCategory[field.key]}
                            onChange={(v) => updateActiveCategory({ [field.key]: v })}
                            suffix={field.suffix}
                        />
                    ))}
                    <div>
                        <label className="text-[11px] font-semibold tracking-widest text-white/40">
                            PICK-PICK-PICKLINE
                        </label>
                        <div className="mt-2 flex h-11 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3">
                            <Switch
                                checked={activeCategory.flatShape}
                                onCheckedChange={(checked) =>
                                    updateActiveCategory({ flatShape: checked === true })
                                }
                            />
                            <span className="text-[14px] text-white/70">flat shape</span>
                        </div>
                    </div>
                </div>
            </div>

            <ParentSku
                paretoBands={activeCategory.paretoBands}
                onUpdateBand={updateBand}
                onAddBand={addBand}
                onRemoveBand={removeBand}
            />
        </div>
    );
}

export default Categories;
