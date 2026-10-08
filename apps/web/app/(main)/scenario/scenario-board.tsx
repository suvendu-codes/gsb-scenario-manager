"use client";

import { Suspense, use, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { useScenarioSelection } from "@/components/shared/Sidebar";
import type { ScenarioMap, ScenarioRow } from "@/lib/types";

const TABS = ["All", "Running", "Finished", "Paused", "Draft"] as const;

type ScenarioTab = (typeof TABS)[number];

const STATUS_COLOR: Record<string, string> = {
  Running: "text-emerald-600",
  Paused: "text-orange-500",
  Finished: "text-neutral-400",
  Draft: "text-neutral-400",
};

const HEADINGS = ["Scenario", "Map", "Status", "Time", "Throughput", "UPH", "Order breaches", ""];

export function ScenarioBoard({ scenariosPromise }: { scenariosPromise: Promise<ScenarioMap> }) {
  const { project, created } = useScenarioSelection();
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-auto bg-white px-6 py-5 text-neutral-900">
      <div className="flex w-full flex-col items-center text-center">
        <h2 className="text-base font-semibold">{project.title}</h2>
        <p className="text-sm text-neutral-400">{project.subtitle}</p>
      </div>
      <Suspense fallback={<TableFallback />}>
        <StreamedScenarios
          scenariosPromise={scenariosPromise}
          projectId={project.id}
          extra={created[project.id] ?? []}
        />
      </Suspense>
    </div>
  );
}

function StreamedScenarios({
  scenariosPromise,
  projectId,
  extra,
}: {
  scenariosPromise: Promise<ScenarioMap>;
  projectId: string;
  extra: ScenarioRow[];
}) {
  const scenarios = use(scenariosPromise);
  return <ScenarioTabs rows={[...(scenarios[projectId] ?? []), ...extra]} />;
}

function ScenarioTabs({ rows }: { rows: ScenarioRow[] }) {
  const [tab, setTab] = useState<ScenarioTab>("All");
  const visible = tab === "All" ? rows : rows.filter((scenario) => scenario.status === tab);

  return (
    <>
      <div role="tablist" aria-label="Scenario status" className="flex flex-wrap justify-center gap-2">
        {TABS.map((item) => {
          const count = item === "All" ? rows.length : rows.filter((scenario) => scenario.status === item).length;
          const selected = tab === item;
          return (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(item)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                selected
                  ? "border-orange-400 bg-orange-100 text-orange-900"
                  : "border-neutral-200 text-neutral-500 hover:bg-neutral-50"
              }`}
            >
              {item} {count}
            </button>
          );
        })}
      </div>
      <ScenarioTable rows={visible} />
    </>
  );
}

function ScenarioTable({ rows }: { rows: ScenarioRow[] }) {
  return (
    <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-neutral-200">
      <table className="w-full text-center text-sm">
        <thead className="text-xs text-neutral-400">
          <tr>
            {HEADINGS.map((heading) => (
              <th key={heading || "menu"} className="px-4 py-3 font-medium">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((scenario, index) => (
            <tr key={`${scenario.name}-${scenario.map}-${index}`} className="border-t border-neutral-100">
              <td className="px-4 py-3 font-medium">{scenario.name}</td>
              <td className="px-4 py-3 text-neutral-600">{scenario.map}</td>
              <td className={`px-4 py-3 ${STATUS_COLOR[scenario.status]}`}>{scenario.status}</td>
              <td className="px-4 py-3 text-neutral-600">{scenario.time}</td>
              <td className="px-4 py-3 text-neutral-600">{scenario.throughput}</td>
              <td className="px-4 py-3 text-neutral-600">{scenario.uph}</td>
              <td className="px-4 py-3 text-neutral-600">{scenario.breaches}</td>
              <td className="px-3 py-3 text-neutral-400">
                <ChevronDown className="mx-auto h-4 w-4" />
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-6 text-neutral-400">
                No scenarios
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function TableFallback() {
  return (
    <div className="flex w-full flex-col items-center gap-4" aria-busy="true" aria-label="Loading scenarios">
      <div className="flex gap-2">
        {TABS.map((item) => (
          <div key={item} className="h-6 w-16 animate-pulse rounded-full border border-neutral-200 bg-neutral-100" />
        ))}
      </div>
      <div className="mx-auto h-64 w-full max-w-5xl animate-pulse rounded-xl border border-neutral-200 bg-neutral-50" />
    </div>
  );
}
