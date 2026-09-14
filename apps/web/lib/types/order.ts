import type React from "react";
import type { LaneAccent } from "./metrics";
import type { CategoryProfile } from "./category";
import type { TemplateItem } from "./template";

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

export interface InventoryProps {
    rows?: InventoryRow[];
    onRowsChange?: (rows: InventoryRow[]) => void;
}

export interface InventoryResponse {
    inventory: InventoryRow[];
}

export interface ProfileProps {
    bootstrap?: BootstrapState;
    onChange?: (bootstrap: BootstrapState) => void;
    setBootstrap?: React.Dispatch<React.SetStateAction<BootstrapState>>;
}

export interface OrderGeneratorWizardProps {
    activeStep?: number;
    onStepChange?: (step: number) => void;
}

export interface OrderSidebarProps {
    activeStep?: number;
    onStepChange?: (step: number) => void;
    onReset?: () => void;
}

export interface OrderHeaderProps {
    selectedAccent?: LaneAccent;
    onReset?: () => void;
    className?: string;
}

export interface GeneratedFormProps {
    bootstrap?: BootstrapState;
    categories?: CategoryProfile[];
    inventory?: InventoryRow[];
    templates?: TemplateItem[];
}
