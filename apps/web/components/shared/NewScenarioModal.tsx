"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { RECENT_PROJECTS, useScenarioSelection } from "@/components/shared/Sidebar";

const MAPS = [
    { id: "ecom", name: "Ecom RTP Baseline", detail: "RTP · Pick Front, Put Front" },
    { id: "msio", name: "Multi-order MSIO", detail: "RTP · Pick Front" },
];

export default function NewScenarioModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { selectedId, addScenario } = useScenarioSelection();
    const [projectId, setProjectId] = useState(selectedId);
    const [mapId, setMapId] = useState(MAPS[0].id);
    const [name, setName] = useState("");

    useEffect(() => {
        if (!open) return;
        function onKey(event: KeyboardEvent) {
            if (event.key === "Escape") onClose();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    function createScenario() {
        const map = MAPS.find((item) => item.id === mapId) ?? MAPS[0];
        const scenarioName = name.trim();
        if (!scenarioName) return;
        addScenario(projectId, {
            name: scenarioName,
            map: map.name,
            status: "Draft",
            time: "Not started",
            throughput: "—",
            uph: "—",
            breaches: "—",
        });
        onClose();
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="new-scenario-title"
                className="w-full max-w-lg rounded-2xl bg-white p-5 text-neutral-900 shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                        <h2 id="new-scenario-title" className="text-lg font-semibold">
                            New scenario
                        </h2>
                        <p className="mt-1 text-sm text-neutral-500">
                            Choose where it runs and name it. You&apos;ll pick its datasets next.
                        </p>
                    </div>
                    <button type="button" aria-label="Close" onClick={onClose} className="text-neutral-400 hover:text-neutral-700">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="flex flex-col gap-4">
                    <ChoiceField
                        label="Project"
                        value={projectId}
                        onChange={setProjectId}
                        options={RECENT_PROJECTS.map((project) => ({
                            id: project.id,
                            title: project.title,
                        }))}
                    />
                    <ChoiceField
                        label="Map"
                        value={mapId}
                        onChange={setMapId}
                        options={MAPS.map((map) => ({
                            id: map.id,
                            title: map.name,
                            detail: map.detail,
                        }))}
                    />
                    <label className="block text-sm text-neutral-600">
                        Scenario name
                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="e.g. Peak day, 20% more volume"
                            className="mt-1.5 h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-orange-400"
                        />
                    </label>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={createScenario}
                        disabled={!name.trim()}
                        className="rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                    >
                        Create scenario
                    </button>
                </div>
            </div>
        </div>
    );
}

function ChoiceField({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: { id: string; title: string; detail?: string }[];
    onChange: (id: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const current = options.find((option) => option.id === value) ?? options[0];

    return (
        <div className="relative">
            <span className="mb-1.5 block text-sm text-neutral-600">{label}</span>
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((currentOpen) => !currentOpen)}
                className="flex h-11 w-full items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 text-left text-sm"
            >
                <span className="truncate">
                    <span className="font-medium">{current.title}</span>
                    {current.detail && <span className="ml-2 text-neutral-400">{current.detail}</span>}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />
            </button>
            {open && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
                    {options.map((option) => (
                        <li key={option.id}>
                            <button
                                type="button"
                                onClick={() => {
                                    onChange(option.id);
                                    setOpen(false);
                                }}
                                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50"
                            >
                                <span>
                                    <span className="font-medium">{option.title}</span>
                                    {option.detail && <span className="ml-2 text-neutral-400">{option.detail}</span>}
                                </span>
                                {option.id === value && <Check className="h-4 w-4 text-neutral-700" />}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
