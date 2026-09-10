export const PROFILE_PRESETS = ["hnm", "peak", "default"];

export const STEP_META: Record<number, { heading: string; description: string }> = {
    1: {
        heading: "Pick the test profile",
        description:
            "Mirrors run_profile_orders.py's bootstrap — which named scenario is being configured, and against which mock environment.",
    },
    2: {
        heading: "Define demand per category",
        description:
            "Each category models an independent order pattern. Pareto SKU bands and pool state are nested inside its tab.",
    },
    3: {
        heading: "Stand in for a live inventory snapshot",
        description:
            "No real API call — sorted by quantity descending before generation, matching the real system.",
    },
    4: {
        heading: "The skeleton to stamp values into",
        description: "Edit the raw JSON directly. A colored preview shows the parsed result.",
    },
    5: {
        heading: "The generated payload",
        description: "Combines the wave plan, mock inventory and templates. SKU picks and quantities are randomized within bounds — regenerate freely..",
    },
};