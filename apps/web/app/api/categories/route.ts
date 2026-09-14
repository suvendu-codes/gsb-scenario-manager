import { NextResponse } from "next/server";
import type { CategoryProfile } from "@/lib/types";

export async function POST(request: Request) {
    const categories = (await request.json()) as CategoryProfile[];

    return NextResponse.json({ success: true, categories });
}
