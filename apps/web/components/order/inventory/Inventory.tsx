"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InventoryRow, InventoryProps } from "@/lib/types";
import { Upload, FileJson, AlertCircle, CheckCircle2, X } from "lucide-react";

export function Inventory({ rows: controlledRows, onRowsChange }: InventoryProps = {}) {
    const [internalRows, setInternalRows] = useState<InventoryRow[]>([
        { sku: "SKU1001", quantity: 50 },
        { sku: "SKU1002", quantity: 12 },
        { sku: "SKU1003", quantity: 30 },
    ]);
    const [skuCount, setSkuCount] = useState(10);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        console.log("Order Inventory Value (Random Generated):", generated);
        if (onRowsChange) {
            onRowsChange(generated);
        } else {
            setInternalRows(generated);
        }
        setUploadSuccess(null);
        setUploadError(null);
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

    function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadError(null);
        setUploadSuccess(null);

        // Validate that file is JSON
        const isJson = file.name.toLowerCase().endsWith(".json") || file.type === "application/json";
        if (!isJson) {
            setUploadError("Invalid file type. Only .json files are allowed.");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const parsed = JSON.parse(text);

                let extractedRows: InventoryRow[] = [];

                if (Array.isArray(parsed)) {
                    extractedRows = parsed.map((item, idx) => ({
                        sku: String(item.sku || item.id || item.name || item.key || `SKU${1001 + idx}`),
                        quantity: Number(item.quantity ?? item.qty ?? item.count ?? item.value ?? 0) || 0,
                    }));
                } else if (typeof parsed === "object" && parsed !== null) {
                    const rawList = parsed.inventory || parsed.rows || parsed.items || parsed.data;
                    if (Array.isArray(rawList)) {
                        extractedRows = rawList.map((item, idx) => ({
                            sku: String(item.sku || item.id || item.name || item.key || `SKU${1001 + idx}`),
                            quantity: Number(item.quantity ?? item.qty ?? item.count ?? item.value ?? 0) || 0,
                        }));
                    } else {
                        // Key-value object format e.g. { "SKU1001": 50, "SKU1002": 12 }
                        extractedRows = Object.entries(parsed).map(([key, val]) => ({
                            sku: key,
                            quantity: typeof val === "number" ? val : Number((val as { quantity?: number; qty?: number })?.quantity ?? (val as { qty?: number })?.qty ?? 0) || 0,
                        }));
                    }
                }

                if (extractedRows.length === 0) {
                    setUploadError("The JSON file does not contain any valid inventory rows.");
                    return;
                }

                if (onRowsChange) {
                    onRowsChange(extractedRows);
                } else {
                    setInternalRows(extractedRows);
                }

                setUploadSuccess(`Successfully loaded ${extractedRows.length} SKUs from ${file.name}`);
            } catch (err: unknown) {
                setUploadError(`Failed to parse JSON file: ${(err as Error).message}`);
            } finally {
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }
        };

        reader.onerror = () => {
            setUploadError("Failed to read the file.");
            if (fileInputRef.current) fileInputRef.current.value = "";
        };

        reader.readAsText(file);
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
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
                    className="h-11 border border-white/10 bg-white/[0.06] px-4 text-white hover:bg-white/[0.1] cursor-pointer"
                >
                    Generate N random SKUs
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddRow}
                    className="h-11 border-dashed border-white/20 bg-transparent px-4 text-white/70 hover:text-white cursor-pointer"
                >
                    + add row
                </Button>

                {/* Shadcn JSON File Upload */}
                <div className="flex items-center">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,application/json"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="inventory-json-file"
                    />
                    <Label
                        htmlFor="inventory-json-file"
                        className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-4 text-[14px] font-medium text-white transition-colors hover:bg-white/[0.1]"
                    >
                        <Upload className="h-4 w-4 text-[var(--st-amber)]" />
                        <FileJson className="h-4 w-4 text-white/70" />
                        Upload JSON
                    </Label>
                </div>
            </div>

            {/* Error Message */}
            {uploadError && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-400">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{uploadError}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setUploadError(null)}
                        className="text-rose-400/60 hover:text-rose-400"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            {/* Success Message */}
            {uploadSuccess && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-400">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>{uploadSuccess}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setUploadSuccess(null)}
                        className="text-emerald-400/60 hover:text-emerald-400"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

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

