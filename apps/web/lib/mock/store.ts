import { findSample } from "@/features/scenario-setup/samples";
import type {
  DatasetRecord,
  DatasetSlot,
  ScenarioDatasets,
  ScenarioDetail,
} from "@/features/scenario-setup/types";
import type {
  CreateScenarioInput,
  Project,
  ProjectMap,
  Scenario,
} from "@/features/scenarios/types";

/**
 * In-memory mock data standing in for core-service until its endpoints
 * exist. Data resets whenever the server restarts.
 */
const projects: Project[] = [
  { id: "coupang-daegu", name: "Coupang Daegu", description: "RTP ecom + retail" },
  { id: "hm-canada", name: "H&M Canada", description: "Relay coexistence" },
  { id: "dillards-dc", name: "Dillard's DC", description: "Case pick / RDC" },
  { id: "sams-club-atl", name: "Sam's Club ATL", description: "P2P baseline" },
];

const projectMaps: ProjectMap[] = [
  {
    id: "ecom-rtp",
    projectId: "coupang-daegu",
    name: "Ecom RTP Baseline",
    description: "RTP · Pick Front, Put Front",
  },
  {
    id: "multi-msio",
    projectId: "coupang-daegu",
    name: "Multi-order MSIO",
    description: "RTP · Pick Front",
  },
  {
    id: "relay-coexist",
    projectId: "hm-canada",
    name: "Relay Coexistence",
    description: "RTP + conveyor relay",
  },
  {
    id: "case-pick",
    projectId: "dillards-dc",
    name: "Case Pick RDC",
    description: "Case pick · regional DC",
  },
  {
    id: "p2p-baseline",
    projectId: "sams-club-atl",
    name: "P2P Baseline",
    description: "Person-to-parts",
  },
];

/** Thrown by `createScenario` when the input is not allowed; carries the HTTP status to return. */
export class MockApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "MockApiError";
    this.status = status;
  }
}

const seedScenarios: Scenario[] = [
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
  {
    id: "9b1f3c52-6a1e-4d0b-8f3a-1c2d3e4f5a06",
    name: "Peak Day v2",
    projectId: "coupang-daegu",
    mapId: "ecom-rtp",
    solutionId: "sol-coupang-v3",
    status: "draft",
    authorId: "gauri",
    createdAt: "2026-09-25T10:00:00.000Z",
    updatedAt: "2026-09-28T17:45:00.000Z",
  },
  {
    id: "9b1f3c52-6a1e-4d0b-8f3a-1c2d3e4f5a07",
    name: "Peak Day",
    projectId: "coupang-daegu",
    mapId: "multi-msio",
    solutionId: "sol-coupang-v3",
    status: "draft",
    authorId: "marta.silva",
    createdAt: "2026-09-24T09:00:00.000Z",
    updatedAt: "2026-09-26T11:15:00.000Z",
  },
];

// Kept on globalThis so created scenarios and their datasets survive dev hot reloads.
const globalStore = globalThis as typeof globalThis & {
  mockScenarios?: Scenario[];
  mockDatasets?: Record<string, ScenarioDatasets>;
};
const scenarios: Scenario[] = (globalStore.mockScenarios ??= [...seedScenarios]);
const datasetsByScenario: Record<string, ScenarioDatasets> = (globalStore.mockDatasets ??= {});

function emptyDatasets(): ScenarioDatasets {
  return { inbound: null, outbound: null, masterdata: null, mockput: null };
}

/** Name shown as the author of scenarios created through the mock. */
const CURRENT_USER_ID = "current.user";

/** Returns all mock scenarios, newest update first. */
export function listScenarios(): Scenario[] {
  return [...scenarios].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Returns all mock projects. */
export function listProjects(): Project[] {
  return projects;
}

/** Returns the maps of one project (an empty list for an unknown project). */
export function listProjectMaps(projectId: string): ProjectMap[] {
  return projectMaps.filter((map) => map.projectId === projectId);
}

/** Throws 404 if the map does not exist in the project. */
function assertMapInProject(input: CreateScenarioInput): void {
  const map = projectMaps.find((m) => m.id === input.mapId && m.projectId === input.projectId);
  if (!map) throw new MockApiError(404, "The selected project or map does not exist.");
}

/** Throws 409 if another scenario on the same map already has this name (ignoring case). */
function assertNameFree(input: CreateScenarioInput, ignoreId?: string): void {
  const nameTaken = scenarios.some(
    (s) =>
      s.id !== ignoreId &&
      s.mapId === input.mapId &&
      s.name.toLowerCase() === input.name.toLowerCase(),
  );
  if (nameTaken) {
    throw new MockApiError(409, "A scenario with this name already exists on this map.");
  }
}

/**
 * Finds a scenario by id.
 *
 * @param id - The scenario id.
 * @throws {MockApiError} 404 if there is no such scenario.
 */
function requireScenario(id: string): Scenario {
  const scenario = scenarios.find((s) => s.id === id);
  if (!scenario) throw new MockApiError(404, "Scenario not found.");
  return scenario;
}

/**
 * Creates a draft scenario.
 * Mirrors the real API's rules: the map must belong to the project, and the
 * name must be unique on that map (compared ignoring case).
 *
 * @param input - Validated project, map and name.
 * @returns The new scenario.
 * @throws {MockApiError} 404 for an unknown project or map, 409 for a duplicate name on the map.
 */
export function createScenario(input: CreateScenarioInput): Scenario {
  assertMapInProject(input);
  assertNameFree(input);

  const now = new Date().toISOString();
  const scenario: Scenario = {
    id: crypto.randomUUID(),
    name: input.name,
    projectId: input.projectId,
    mapId: input.mapId,
    solutionId: null,
    status: "draft",
    authorId: CURRENT_USER_ID,
    createdAt: now,
    updatedAt: now,
  };
  scenarios.push(scenario);
  return scenario;
}

/**
 * Returns a scenario together with its datasets.
 *
 * @param id - The scenario id.
 * @throws {MockApiError} 404 if there is no such scenario.
 */
export function getScenarioDetail(id: string): ScenarioDetail {
  const scenario = requireScenario(id);
  return { ...scenario, datasets: datasetsByScenario[id] ?? emptyDatasets() };
}

/**
 * Edits a draft scenario's project, map and name, with the same rules as creating one.
 *
 * @param id - The scenario id.
 * @param input - Validated project, map and name.
 * @returns The updated scenario.
 * @throws {MockApiError} 404 for an unknown scenario, project or map; 409 if the scenario is
 *   not a draft or the name is taken on the map.
 */
export function updateScenario(id: string, input: CreateScenarioInput): Scenario {
  const scenario = requireScenario(id);
  if (scenario.status !== "draft") {
    throw new MockApiError(409, "Only draft scenarios can be edited.");
  }
  assertMapInProject(input);
  assertNameFree(input, id);

  Object.assign(scenario, {
    name: input.name,
    projectId: input.projectId,
    mapId: input.mapId,
    updatedAt: new Date().toISOString(),
  });
  return scenario;
}

/**
 * Attaches a dataset to a scenario, replacing any file already in that slot.
 *
 * @param id - The scenario id.
 * @param record - The dataset to attach (its `slot` says where it goes).
 * @returns The stored record.
 * @throws {MockApiError} 404 if there is no such scenario.
 */
export function attachDataset(id: string, record: DatasetRecord): DatasetRecord {
  const scenario = requireScenario(id);
  const datasets = (datasetsByScenario[id] ??= emptyDatasets());
  datasets[record.slot] = record;
  scenario.updatedAt = new Date().toISOString();
  return record;
}

/**
 * Attaches one of the built-in sample files to a scenario.
 *
 * @param id - The scenario id.
 * @param slot - The dataset slot to fill.
 * @param sampleId - Id of the sample file; it must belong to that slot.
 * @throws {MockApiError} 400 for an unknown sample or one that belongs to another slot,
 *   404 if there is no such scenario.
 */
export function attachSample(id: string, slot: DatasetSlot, sampleId: string): DatasetRecord {
  const sample = findSample(sampleId);
  if (!sample || sample.slot !== slot) {
    throw new MockApiError(400, "Unknown sample file for this dataset.");
  }
  return attachDataset(id, {
    slot,
    fileName: sample.fileName,
    source: "sample",
    sizeBytes: null,
    uploadedAt: new Date().toISOString(),
    valid: sample.valid,
    issues: sample.issues,
    profile: sample.profile,
  });
}
