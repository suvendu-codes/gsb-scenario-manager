import { STEPS, DEFAULT_CATEGORIES, TEMPLATES } from "@/lib/data";
import { OrderWizardState, OrderWizardAction } from "@/lib/types";

export const initialOrderState: OrderWizardState = {
    step: 1,
    bootstrap: {
        profileName: "hnm",
        butlerCoreIp: "172.29.14.21",
        platformCoreIp: "172.29.14.22",
        putMode: false,
    },
    categories: DEFAULT_CATEGORIES,
    inventory: [
        { sku: "SKU1001", quantity: 50 },
        { sku: "SKU1002", quantity: 12 },
        { sku: "SKU1003", quantity: 30 },
    ],
    templates: TEMPLATES,
};

export function orderWizard(state: OrderWizardState, action: OrderWizardAction): OrderWizardState {
    switch (action.type) {
        case "SET_STEP":
            return { ...state, step: action.payload };
        case "PREV_STEP": {
            const currentIndex = STEPS.findIndex((s) => s.id === state.step);
            if (currentIndex > 0) {
                return { ...state, step: STEPS[currentIndex - 1].id };
            }
            return state;
        }
        case "NEXT_STEP": {
            const currentIndex = STEPS.findIndex((s) => s.id === state.step);
            if (currentIndex < STEPS.length - 1) {
                return { ...state, step: STEPS[currentIndex + 1].id };
            }
            return state;
        }
        case "SET_BOOTSTRAP":
            return { ...state, bootstrap: action.payload };
        case "SET_CATEGORIES":
            return { ...state, categories: action.payload };
        case "SET_INVENTORY":
            return { ...state, inventory: action.payload };
        case "SET_TEMPLATES":
            return { ...state, templates: action.payload };
        case "RESET":
            return initialOrderState;
        default:
            return state;
    }
}

export default orderWizard;
