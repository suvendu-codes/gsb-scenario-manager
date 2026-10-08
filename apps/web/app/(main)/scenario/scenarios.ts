import type { ScenarioMap } from "@/lib/types";

const SCENARIOS: ScenarioMap = {
  coupang: [
    { name: "Base Scenario", map: "Multi-order MSIO", status: "Running", time: "1h 45m", throughput: "—", uph: "—", breaches: "—" },
    { name: "Bot Failure Event", map: "Ecom RTP Baseline", status: "Paused", time: "3h 20m", throughput: "—", uph: "—", breaches: "—" },
    { name: "Peak Day", map: "Ecom RTP Baseline", status: "Finished", time: "8h", throughput: "15,547", uph: "205", breaches: "3.8%" },
    { name: "Normal Day", map: "Ecom RTP Baseline", status: "Finished", time: "6h", throughput: "11,186", uph: "197", breaches: "1.2%" },
    { name: "Base Scenario", map: "Ecom RTP Baseline", status: "Finished", time: "8h", throughput: "10,333", uph: "136", breaches: "1.6%" },
    { name: "Peak Day v2", map: "Ecom RTP Baseline", status: "Draft", time: "Not started", throughput: "—", uph: "—", breaches: "—" },
    { name: "Peak Day", map: "Multi-order MSIO", status: "Draft", time: "Not started", throughput: "—", uph: "—", breaches: "—" },
  ],
  "hm-canada": [
    { name: "Base Scenario", map: "Multi-order MSIO", status: "Running", time: "1h 45m", throughput: "—", uph: "—", breaches: "—" },
  ],
  "dillards-dc": [
    { name: "Peak Day", map: "Ecom RTP Baseline", status: "Finished", time: "8h", throughput: "15,547", uph: "205", breaches: "3.8%" },
    { name: "Normal Day", map: "Ecom RTP Baseline", status: "Finished", time: "6h", throughput: "11,186", uph: "197", breaches: "1.2%" },
  ],
  "sams-atl": [
    { name: "Peak Day v2", map: "Ecom RTP Baseline", status: "Draft", time: "Not started", throughput: "—", uph: "—", breaches: "—" },
  ],
};

// ponytail: local stand-in for a scenario API. The delay is what lets the table Suspense boundary stream; drop it when this reads a real backend.
export function getScenarios(): Promise<ScenarioMap> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(SCENARIOS), 400);
  });
}
