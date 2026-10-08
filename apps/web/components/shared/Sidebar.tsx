"use client"
import { GiHamburgerMenu } from "react-icons/gi";
import { Search } from "lucide-react";
import { createContext, useContext, useState } from "react";
import type { ScenarioRow } from "@/lib/types";

type RecentProject = {
    id: string;
    name: string;
    meta: string;
    title: string;
    subtitle: string;
};

export const RECENT_PROJECTS: RecentProject[] = [
    { id: "coupang", name: "Coupang", meta: "Daegu · 2 maps · 1 running", title: "Coupang Daegu", subtitle: "Daegu · 2 maps" },
    { id: "hm-canada", name: "H&M", meta: "Canada · 2 scenarios · 1 running", title: "H&M Canada", subtitle: "Canada · 2 scenarios" },
    { id: "dillards-dc", name: "Dillard", meta: "Dallas · 2 scenarios", title: "Dillard's DC", subtitle: "Dallas · 2 scenarios" },
    { id: "sams-atl", name: "Sam's", meta: "Atlanta · 1 scenario", title: "Sam's Club ATL", subtitle: "Atlanta · 1 scenario" },
];

const ScenarioSelectionContext = createContext<{
    selectedId: string;
    setSelectedId: (id: string) => void;
    project: RecentProject;
    created: Record<string, ScenarioRow[]>;
    addScenario: (projectId: string, row: ScenarioRow) => void;
} | null>(null);

export function ScenarioSelectionProvider({ children }: { children: React.ReactNode }) {
    const [selectedId, setSelectedId] = useState("coupang");
    const [created, setCreated] = useState<Record<string, ScenarioRow[]>>({});
    const project = RECENT_PROJECTS.find((item) => item.id === selectedId) ?? RECENT_PROJECTS[0];

    function addScenario(projectId: string, row: ScenarioRow) {
        setCreated((current) => ({
            ...current,
            [projectId]: [...(current[projectId] ?? []), row],
        }));
        setSelectedId(projectId);
    }

    return (
        <ScenarioSelectionContext.Provider value={{ selectedId, setSelectedId, project, created, addScenario }}>
            {children}
        </ScenarioSelectionContext.Provider>
    );
}

export function useScenarioSelection() {
    const value = useContext(ScenarioSelectionContext);
    if (!value) {
        throw new Error("useScenarioSelection must be used within ScenarioSelectionProvider");
    }
    return value;
}

export function Sidebar() {
    const [show, setShow] = useState(false);
    const [query, setQuery] = useState("");
    const { selectedId, setSelectedId } = useScenarioSelection();
    const projects = RECENT_PROJECTS.filter((project) => {
        const haystack = `${project.name} ${project.meta}`.toLowerCase();
        return haystack.includes(query.trim().toLowerCase());
    });

    return (
            <>
                <div
                    onClick={() => setShow(!show)}
                    className="fixed top-5 right-5 z-50 cursor-pointer rounded-md bg-orange-500 p-2 text-3xl text-white shadow-lg lg:hidden"
                    role="button"
                    aria-label="Toggle sidebar"
                >
                    <GiHamburgerMenu />
                </div>
                {show && (
                    <div
                        onClick={() => setShow(false)}
                        className="fixed inset-0 z-40 bg-black/60 lg:hidden"
                        aria-hidden="true"
                    />
                )}
            <aside
                className={`fixed top-0 z-50 flex h-full w-[100%] flex-col overflow-y-auto border-r border-neutral-200 bg-[#f6f7f8] p-3 text-neutral-900 transition-all duration-100 sm:w-[300px] lg:static lg:left-0 lg:h-auto lg:w-60 lg:self-stretch ${
                    show ? "left-0" : "left-[-100%] lg:left-0"
                }`}
            >
                <label className="relative mb-3 block">
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-orange-500" />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search projects"
                        aria-label="Search projects"
                        className="h-9 w-full rounded-lg border border-neutral-200 bg-white pr-3 pl-8 text-sm outline-none placeholder:text-neutral-400 focus:border-orange-400"
                    />
                </label>
                <div className="mb-2 flex items-center justify-between px-0.5 text-xs text-neutral-400">
                    <span>Recent</span>
                    <span>
                        {projects.length} {projects.length === 1 ? "project" : "projects"}
                    </span>
                </div>
                <ul className="flex flex-col gap-2">
                    {projects.map((project) => {
                        const selected = selectedId === project.id;
                        return (
                            <li key={project.id}>
                                <button
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => {
                                        setSelectedId(project.id);
                                        setShow(false);
                                    }}
                                    className={`flex h-14 w-full flex-col justify-center rounded-lg border bg-white px-3 text-left ${
                                        selected
                                            ? "border-orange-500"
                                            : "border-neutral-200 hover:border-neutral-300"
                                    }`}
                                >
                                    <span className="truncate text-sm font-medium text-neutral-900">
                                        {project.name}
                                    </span>
                                    <span className="truncate text-xs text-neutral-500">
                                        {project.meta}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
                {projects.length === 0 && (
                    <p className="px-1 text-sm text-neutral-500">No projects</p>
                )}
            </aside>
        </>
    );
}

export default Sidebar;
