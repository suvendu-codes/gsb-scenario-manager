"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { HeaderProps } from "@/lib/types";

const NewScenarioModal = dynamic(() => import("@/components/shared/NewScenarioModal"));

export default function EmulationHeader(_props: HeaderProps) {
    const [open, setOpen] = useState(false);

    return (
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white py-3 pr-16 pl-4 text-neutral-900 lg:pr-4">
            <h1 className="text-base font-semibold">Emulations</h1>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="rounded-full bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600"
            >
                + New scenario
            </button>
            {open && <NewScenarioModal open onClose={() => setOpen(false)} />}
        </header>
    );
}
