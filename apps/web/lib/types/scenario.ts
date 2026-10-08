export type ScenarioStatus = "Running" | "Finished" | "Paused" | "Draft";

export interface ScenarioRow {
    name: string;
    map: string;
    status: ScenarioStatus;
    time: string;
    throughput: string;
    uph: string;
    breaches: string;
}

export interface ScenarioMap {
    [projectId: string]: ScenarioRow[];
}
