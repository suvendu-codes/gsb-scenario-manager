"use client";

import { Input } from "@/components/ui/input";
import { ParetoBand } from "@/lib/types";

interface ParentSkuProps {
    paretoBands: ParetoBand[];
    onUpdateBand: (index: number, field: keyof ParetoBand, value: string) => void;
    onAddBand: () => void;
    onRemoveBand: (index: number) => void;
}

export function ParentSku({
    paretoBands,
    onUpdateBand,
    onAddBand,
    onRemoveBand,
}: ParentSkuProps) {
    const skuTotal = paretoBands.reduce((sum, band) => sum + band.skuPct, 0);

    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[13px] font-semibold tracking-widest text-white/70">
                        PARETO SKU BANDS
                    </span>
                    <span className="text-[13px] text-white/40">
                        80/20 rule — % of SKUs vs % of orders they generate
                    </span>
                </div>
                <span className="rounded-md bg-[var(--st-amber)]/15 px-3 py-1 font-mono text-[13px] text-[var(--st-amber)]">
                    sku total {skuTotal}%
                </span>
            </div>

            <div className="mt-5 grid grid-cols-[1fr_1fr_1fr_44px] gap-3">
                <span className="text-[11px] font-semibold tracking-widest text-white/40">
                    SKU %
                </span>
                <span className="text-[11px] font-semibold tracking-widest text-white/40">
                    ORDER %
                </span>
                <span className="text-[11px] font-semibold tracking-widest text-white/40">
                    INVENTORY %
                </span>
                <span />
            </div>
            <div className="mt-2 flex flex-col gap-3">
                {paretoBands.map((band, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_1fr_44px] gap-3">
                        <Input
                            type="number"
                            value={band.skuPct}
                            onChange={(e) => onUpdateBand(i, "skuPct", e.target.value)}
                            className="h-11 border-white/10 bg-white/[0.02] text-[15px] text-white"
                        />
                        <Input
                            type="number"
                            value={band.orderPct}
                            onChange={(e) => onUpdateBand(i, "orderPct", e.target.value)}
                            className="h-11 border-white/10 bg-white/[0.02] text-[15px] text-white"
                        />
                        <Input
                            type="number"
                            value={band.inventoryPct}
                            onChange={(e) => onUpdateBand(i, "inventoryPct", e.target.value)}
                            className="h-11 border-white/10 bg-white/[0.02] text-[15px] text-white"
                        />
                        <button
                            type="button"
                            aria-label="Remove band"
                            onClick={() => onRemoveBand(i)}
                            className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 text-white/50 hover:text-white"
                        >
                            &times;
                        </button>
                    </div>
                ))}
            </div>
            <button
                type="button"
                onClick={onAddBand}
                className="mt-3 rounded-lg border border-dashed border-white/20 bg-transparent px-4 py-2 text-[13px] text-white/60 hover:text-white"
            >
                + add band
            </button>
        </div>
    );
}

export default ParentSku;
