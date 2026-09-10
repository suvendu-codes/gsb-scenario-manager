"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InventoryRow } from "@/lib/types";

interface InventoryProps {
    rows?: InventoryRow[];
    onRowsChange?: (rows: InventoryRow[]) => void;
}

export function Inventory({ rows: controlledRows, onRowsChange }: InventoryProps = {}) {
    const [internalRows, setInternalRows] = useState<InventoryRow[]>([
        { sku: "SKU1001", quantity: 50 },
        { sku: "SKU1002", quantity: 12 },
        { sku: "SKU1003", quantity: 30 },
    ]);
    const [skuCount, setSkuCount] = useState(10);

    const rows = controlledRows ?? internalRows;

    function updateRows(updater: (prev: InventoryRow[]) => InventoryRow[]) {
        if (onRowsChange) {
            onRowsChange(updater(rows));
        } else {
            setInternalRows(updater);
        }
    }

    function handleGenerateRandom() {
        const count = Math.max(1, skuCount);
        const generated: InventoryRow[] = Array.from({ length: count }, (_, i) => ({
            sku: `SKU${1001 + i}`,
            quantity: Math.floor(Math.random() * 100) + 1,
        })).sort((a, b) => b.quantity - a.quantity);
        if (onRowsChange) {
            onRowsChange(generated);
        } else {
            setInternalRows(generated);
        }
    }

    function handleAddRow() {
        updateRows((prev) => [...prev, { sku: `SKU${1001 + prev.length}`, quantity: 0 }]);
    }

    function updateRow(index: number, field: keyof InventoryRow, value: string) {
        updateRows((prev) =>
            prev.map((row, i) =>
                i === index
                    ? { ...row, [field]: field === "quantity" ? Number(value) || 0 : value }
                    : row
            )
        );
    }

    function removeRow(index: number) {
        updateRows((prev) => prev.filter((_, i) => i !== index));
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
                <Input
                    type="number"
                    min={1}
                    value={skuCount}
                    onChange={(e) => setSkuCount(Number(e.target.value) || 0)}
                    className="h-11 w-24 shrink-0 border-white/10 bg-white/[0.02] text-[15px] text-white"
                />
                <Button
                    type="button"
                    onClick={handleGenerateRandom}
                    className="h-11 border border-white/10 bg-white/[0.06] px-4 text-white hover:bg-white/[0.1]"
                >
                    Generate N random SKUs
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddRow}
                    className="h-11 border-dashed border-white/20 bg-transparent px-4 text-white/70 hover:text-white"
                >
                    + add row
                </Button>
            </div>

            <div>
                <div className="grid grid-cols-[1fr_1fr_44px] gap-3 pb-2">
                    <span className="text-[11px] font-semibold tracking-widest text-white/40">
                        SKU
                    </span>
                    <span className="text-[11px] font-semibold tracking-widest text-white/40">
                        QUANTITY
                    </span>
                    <span />
                </div>
                <div className="flex flex-col gap-3">
                    {rows.map((row, i) => (
                        <div key={i} className="grid grid-cols-[1fr_1fr_44px] gap-3">
                            <Input
                                value={row.sku}
                                onChange={(e) => updateRow(i, "sku", e.target.value)}
                                className="h-11 border-white/10 bg-white/[0.02] text-[15px] text-white"
                            />
                            <Input
                                type="number"
                                value={row.quantity}
                                onChange={(e) => updateRow(i, "quantity", e.target.value)}
                                className="h-11 border-white/10 bg-white/[0.02] text-[15px] text-white"
                            />
                            <button
                                type="button"
                                aria-label="Remove row"
                                onClick={() => removeRow(i)}
                                className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 text-white/50 hover:text-white"
                            >
                                &times;
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Inventory;
