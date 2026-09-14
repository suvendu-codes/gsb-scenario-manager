import { NextResponse } from "next/server";
import type { InventoryRow } from "@/lib/types";

const MOCK_INVENTORY: InventoryRow[] = [
    { sku: "SKU1001", quantity: 50 },
    { sku: "SKU1002", quantity: 12 },
    { sku: "SKU1003", quantity: 30 },
];

export async function GET() {
    return NextResponse.json({ inventory: MOCK_INVENTORY });
}
