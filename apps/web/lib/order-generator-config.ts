import type { BootstrapState, InventoryRow } from "@/lib/types";

export const DEFAULT_BOOTSTRAP: BootstrapState = {
  profileName: "hnm",
  butlerCoreIp: "172.29.14.21",
  platformCoreIp: "172.29.14.22",
  putMode: false,
};

export const DEFAULT_INVENTORY: InventoryRow[] = [
  { sku: "SKU1001", quantity: 50 },
  { sku: "SKU1002", quantity: 12 },
  { sku: "SKU1003", quantity: 30 },
];

export const SECTION_META = [
  {
    id: "order-step-1",
    label: "01 · BOOTSTRAP",
    title: "Pick the test profile",
    description: "Choose the named scenario for this order payload.",
  },
  {
    id: "order-step-2",
    label: "02 · CATEGORIES",
    title: "Define demand per category",
    description: "",
  },
  {
    id: "order-step-3",
    label: "03 · MOCK INVENTORY",
    title: "Stand in for a live inventory snapshot",
    description: "",
  },
  {
    id: "order-step-4",
    label: "04 · JSON TEMPLATES",
    title: "The skeleton to stamp values into",
    description: "",
  },
  {
    id: "order-step-5",
    label: "05 · GENERATE & PREVIEW",
    title: "The generated payload",
    description: "",
  },
] as const;
