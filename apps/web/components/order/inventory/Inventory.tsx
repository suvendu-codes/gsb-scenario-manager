"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InventoryProps, InventoryRow } from "@/lib/types";

export function Inventory({ rows: controlledRows, onRowsChange }: InventoryProps = {}) {
    const [internalRows, setInternalRows] = useState<InventoryRow[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const rows = controlledRows ?? internalRows;

    function updateRows(nextRows: InventoryRow[]) {
        if (onRowsChange) {
            onRowsChange(nextRows);
        } else {
            setInternalRows(nextRows);
        }
    }

    function parseCsv(text: string): InventoryRow[] {
        const lines = text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);

        if (lines.length === 0) return [];

        const rowsFromCsv = lines.slice(1).map((line) => {
            const [sku = "", quantity = "0"] = line.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
            return {
                sku,
                quantity: Number(quantity) || 0,
            };
        });

        return rowsFromCsv.filter((row) => row.sku.length > 0);
    }

    function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = () => {
            const text = String(reader.result ?? "");
            updateRows(parseCsv(text));
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        };

        reader.readAsText(file);
    }

    return (
        <div className="flex items-center justify-start">
            <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
                aria-label="Upload CSV inventory file"
            />

            <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-11 border border-white/10 bg-white/[0.06] px-4 text-white hover:bg-white/[0.1]"
            >
                <Upload className="mr-2 h-4 w-4" />
                Upload CSV
            </Button>
        </div>
    );
}

export default Inventory;
