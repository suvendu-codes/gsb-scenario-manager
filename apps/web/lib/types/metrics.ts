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

export interface HeaderProps {
    playing?: boolean;
    onTogglePlay?: () => void;
    selectedAccent?: LaneAccent;
    onSelectAccent?: (accent: LaneAccent) => void;
    className?: string;
}

export interface SelectedEvent {
    event: TimelineEvent;
    lane: Lane;
    groupLabel: string;
    accent: LaneAccent;
}

export type PlaybackSpeed = "0.5x" | "1x" | "2x" | "4x";

export interface PlaybackContextValue {
    playing: boolean;
    speed: PlaybackSpeed;
    currentTime: number;
    duration: number;
    togglePlaying: () => void;
    setSpeed: (speed: PlaybackSpeed) => void;
    stepForward: () => void;
    skipToEnd: () => void;
    replay: () => void;
    reset: () => void;
    seek: (time: number) => void;
}