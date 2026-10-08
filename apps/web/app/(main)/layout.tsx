"use client";

import EmulationHeader from "@/components/shared/Header";
import Sidebar, { ScenarioSelectionProvider } from "@/components/shared/Sidebar";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ScenarioSelectionProvider>
            <div className="flex min-h-screen w-full flex-col bg-white font-sans text-neutral-900">
                <EmulationHeader />
                <div className="flex flex-1 overflow-hidden bg-white">
                    <Sidebar />
                    <main className="min-w-0 min-h-0 flex-1 flex flex-col overflow-hidden">{children}</main>
                </div>
            </div>
        </ScenarioSelectionProvider>
    );
}
