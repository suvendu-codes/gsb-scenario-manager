import type { ScenarioStatus } from "@/lib/types";

const STYLE: Record<ScenarioStatus, string> = {
  Running: "bg-emerald-50 text-emerald-700",
  Paused: "bg-orange-50 text-orange-600",
  Finished: "bg-neutral-100 text-neutral-500",
  Draft: "bg-neutral-100 text-neutral-500",
};

export function ScenarioStatusBadge({ status }: { status: ScenarioStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STYLE[status]}`}>
      {status}
    </span>
  );
}
