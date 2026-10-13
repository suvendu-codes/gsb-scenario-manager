import type { Scenario } from "@/features/scenarios/types";

/**
 * In-memory mock data standing in for core-service until its `/scenarios`
 * endpoint exists. Data resets whenever the server restarts.
 */
const scenarios: Scenario[] = [
  {
    id: "9b1f3c52-6a1e-4d0b-8f3a-1c2d3e4f5a01",
    name: "Normal Day",
    projectId: "coupang-daegu",
    mapId: "ecom-rtp",
    solutionId: "sol-coupang-v3",
    status: "completed",
    authorId: "priya.nair",
    createdAt: "2026-08-02T09:30:00.000Z",
    updatedAt: "2026-08-14T14:05:00.000Z",
  },
  {
    id: "9b1f3c52-6a1e-4d0b-8f3a-1c2d3e4f5a02",
    name: "Peak Day",
    projectId: "coupang-daegu",
    mapId: "ecom-rtp",
    solutionId: "sol-coupang-v3",
    status: "completed",
    authorId: "priya.nair",
    createdAt: "2026-08-20T11:00:00.000Z",
    updatedAt: "2026-09-02T16:40:00.000Z",
  },
  {
    id: "9b1f3c52-6a1e-4d0b-8f3a-1c2d3e4f5a03",
    name: "Base Scenario",
    projectId: "coupang-daegu",
    mapId: "multi-msio",
    solutionId: "sol-coupang-v3",
    status: "active",
    authorId: "marta.silva",
    createdAt: "2026-09-18T08:15:00.000Z",
    updatedAt: "2026-09-29T10:20:00.000Z",
  },
  {
    id: "9b1f3c52-6a1e-4d0b-8f3a-1c2d3e4f5a04",
    name: "Relay Stress Test",
    projectId: "hm-canada",
    mapId: "relay-coexist",
    solutionId: null,
    status: "active",
    authorId: "aarav.mehta",
    createdAt: "2026-09-22T13:10:00.000Z",
    updatedAt: "2026-09-29T09:50:00.000Z",
  },
  {
    id: "9b1f3c52-6a1e-4d0b-8f3a-1c2d3e4f5a05",
    name: "Normal Day",
    projectId: "dillards-dc",
    mapId: "case-pick",
    solutionId: "sol-dillards-v1",
    status: "draft",
    authorId: "lena.fischer",
    createdAt: "2026-09-17T15:00:00.000Z",
    updatedAt: "2026-09-19T12:30:00.000Z",
  },
];

/** Returns all mock scenarios, newest update first. */
export function listScenarios(): Scenario[] {
  return [...scenarios].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
