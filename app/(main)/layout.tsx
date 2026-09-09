"use client";

import { useState } from "react";
import Header from "@/components/shared/Header";
import Sidebar from "@/components/shared/Sidebar";
import Metrics from "@/components/shared/Metrics";
import type { LaneAccent } from "@/components/shared/data";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [playing, setPlaying] = useState(true);
    const [accent, setAccent] = useState<LaneAccent>("amber");

    return (
        <div className="flex min-h-screen w-full flex-col bg-[var(--st-bg)] font-sans text-[var(--st-text)]">
            <Header
                playing={playing}
                onTogglePlay={() => setPlaying((v) => !v)}
                selectedAccent={accent}
                onSelectAccent={setAccent}
            />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-auto">{children}</main>
                <Metrics visible={playing} accent={accent} />
            </div>
        </div>
    );
}
