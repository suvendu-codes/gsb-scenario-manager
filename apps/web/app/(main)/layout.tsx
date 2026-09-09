"use client";

import { useState } from "react";
import Header from "@/components/shared/Header";
import Sidebar from "@/components/shared/Sidebar";
import Metrics from "@/components/shared/Metrics";
import { PlaybackProvider, usePlayback } from "@/components/scenorio-timeline/playback-context";
import { LaneAccent } from "@/lib/types";

function MainLayoutContent({
    children,
    accent,
    setAccent,
}: {
    children: React.ReactNode;
    accent: LaneAccent;
    setAccent: (accent: LaneAccent) => void;
}) {
    const { playing, togglePlaying } = usePlayback();

    return (
        <div className="flex min-h-screen w-full flex-col bg-[var(--st-bg)] font-sans text-[var(--st-text)]">
            <Header
                playing={playing}
                onTogglePlay={togglePlaying}
                selectedAccent={accent}
                onSelectAccent={setAccent}
            />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="min-w-0 min-h-0 flex-1 flex flex-col overflow-hidden">{children}</main>
                <Metrics visible={playing} accent={accent} />
            </div>
        </div>
    );
}

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [accent, setAccent] = useState<LaneAccent>("amber");

    return (
        <PlaybackProvider>
            <MainLayoutContent accent={accent} setAccent={setAccent}>
                {children}
            </MainLayoutContent>
        </PlaybackProvider>
    );
}
