// import type { LaneAccent } from "./data";

// export const accentColor: Record<LaneAccent, string> = {
//     amber: "var(--st-amber, #f59e0b)",
//     blue: "var(--st-blue, #38bdf8)",
//     coral: "var(--st-coral, #f87171)",
//     teal: "var(--st-teal, #2dd4bf)",
// };

// export const accentFill: Record<LaneAccent, string> = {
//     amber: "var(--st-amber-fill, rgba(245, 158, 11, 0.2))",
//     blue: "var(--st-blue-fill, rgba(56, 189, 248, 0.2))",
//     coral: "var(--st-coral-fill, rgba(248, 113, 113, 0.2))",
//     teal: "var(--st-teal-fill, rgba(45, 212, 191, 0.2))",
// };

import type { LaneAccent } from "./data";

export const accentColor: Record<LaneAccent, string> = {
    amber: "var(--st-amber)",
    blue: "var(--st-blue)",
    coral: "var(--st-coral)",
    teal: "var(--st-teal)",
};

export const accentFill: Record<LaneAccent, string> = {
    amber: "var(--st-amber-fill)",
    blue: "var(--st-blue-fill)",
    coral: "var(--st-coral-fill)",
    teal: "var(--st-teal-fill)",
};

export const ACCENTS: LaneAccent[] = ["amber", "blue", "coral", "teal"];