"use client";

import React from "react";
import {
    BootstrapState,
    CategoryProfile,
    InventoryRow,
    TemplateItem,
    OrderWizardAction,
} from "@/lib/types";
import { Profile, Categories, Inventory, Template, GeneratedForm } from "./OrderStepComponents";

export interface RenderStepContentProps {
    activeStep: number;
    bootstrap: BootstrapState;
    categories: CategoryProfile[];
    inventory: InventoryRow[];
    templates: TemplateItem[];
    dispatch: React.Dispatch<OrderWizardAction>;
}

export function RenderStepContent({
    activeStep,
    bootstrap,
    categories,
    inventory,
    templates,
    dispatch,
}: RenderStepContentProps) {
    switch (activeStep) {
        case 1:
            return (
                <Profile
                    bootstrap={bootstrap}
                    onChange={(val) => dispatch({ type: "SET_BOOTSTRAP", payload: val })}
                />
            );
        case 2:
            return (
                <Categories
                    categories={categories}
                    onChange={(val) => dispatch({ type: "SET_CATEGORIES", payload: val })}
                />
            );
        case 3:
            return (
                <Inventory
                    rows={inventory}
                    onRowsChange={(val) => dispatch({ type: "SET_INVENTORY", payload: val })}
                />
            );
        case 4:
            return (
                <Template
                    templates={templates}
                    onChange={(val) => dispatch({ type: "SET_TEMPLATES", payload: val })}
                />
            );
        case 5:
            return (
                <GeneratedForm
                    bootstrap={bootstrap}
                    categories={categories}
                    inventory={inventory}
                    templates={templates}
                />
            );
        default:
            return null;
    }
}

export default RenderStepContent;
