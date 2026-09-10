export type LaneAccent = "amber" | "blue" | "coral" | "teal";

export interface Lane {
    id: string;
    label: string;
    count: number;
}

export interface LaneGroup {
    id: string;
    label: string;
    accent: LaneAccent;
    lanes: Lane[];
}
export interface TimelineEvent {
    /** seconds from scenario start */
    time: number;
    count?: number;
}

export interface Metric {
    label: string;
    value: string;
    unit: string;
}

export interface MetricsProps {
    visible?: boolean;
    accent?: LaneAccent;
}