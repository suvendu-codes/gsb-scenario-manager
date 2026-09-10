import type { LaneAccent } from "./metrics";

export interface PayloadSectionItem {
    id: string;
    label: string;
    step?: string;
    description?: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    accent?: LaneAccent;
    badge?: string;
    badgeVariant?: "amber" | "blue" | "teal" | "coral" | "neutral";
    status?: "complete" | "pending" | "optional";
}

export interface PayloadGroup {
    id: string;
    title: string;
    accent?: LaneAccent;
    items: PayloadSectionItem[];
}

export interface PayloadSidebarProps {
    activeId?: string;
    onSelect?: (id: string) => void;
    groups?: PayloadGroup[];
    className?: string;
}
export interface Step {
    id: number;
    title: string;
    subtitle: string;
}


export interface BootstrapState {
    profileName: string;
    butlerCoreIp: string;
    platformCoreIp: string;
    putMode: boolean;
}

export interface InventoryRow {
    sku: string;
    quantity: number;
}