"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { STEP_META } from "./steps";
import { STEPS, DEFAULT_CATEGORIES, TEMPLATES } from "@/lib/data";
import { BootstrapState, CategoryProfile, InventoryRow, TemplateItem } from "@/lib/types";
import DynamicLazy from "@/lib/LazyLoad";

const Profile = (props: { bootstrap: BootstrapState; onChange: (val: BootstrapState) => void }) => (
    <DynamicLazy
        importFunc={() => import("./profile/profile")}
        componentProps={props}
        fallback={
            <div className="flex h-48 items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] text-[13px] text-white/40">
                <span className="animate-pulse">Loading profile...</span>
            </div>
        }
    />
);
const Categories = (props: { categories: CategoryProfile[]; onChange: (val: CategoryProfile[]) => void }) => (
    <DynamicLazy
        importFunc={() => import("./Categories/Categories")}
        componentProps={props}
        fallback={
            <div className="flex h-48 items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] text-[13px] text-white/40">
                <span className="animate-pulse">Loading categories...</span>
            </div>
        }
    />
);
const Inventory = (props: { rows: InventoryRow[]; onRowsChange: (val: InventoryRow[]) => void }) => (
    <DynamicLazy
        importFunc={() => import("./inventory/Inventory")}
        componentProps={props}
        fallback={
            <div className="flex h-48 items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] text-[13px] text-white/40">
                <span className="animate-pulse">Loading inventory...</span>
            </div>
        }
    />
);
const Template = (props: { templates: TemplateItem[]; onChange: (val: TemplateItem[]) => void }) => (
    <DynamicLazy
        importFunc={() => import("./templates/Template")}
        componentProps={props}
        fallback={
            <div className="flex h-48 items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] text-[13px] text-white/40">
                <span className="animate-pulse">Loading templates...</span>
            </div>
        }
    />
);
const GeneratedForm = (props: {
    bootstrap: BootstrapState;
    categories: CategoryProfile[];
    inventory: InventoryRow[];
    templates: TemplateItem[];
}) => (
    <DynamicLazy
        importFunc={() => import("./generated/Form")}
        componentProps={props}
        fallback={
            <div className="flex h-48 items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] text-[13px] text-white/40">
                <span className="animate-pulse">Loading generator...</span>
            </div>
        }
    />
);

interface OrderGeneratorWizardProps {
    activeStep?: number;
    onStepChange?: (step: number) => void;
}

export function OrderGeneratorWizard({
    activeStep: controlledActiveStep,
    onStepChange,
}: OrderGeneratorWizardProps = {}) {
    const [internalStep, setInternalStep] = useState(1);
    const activeStep = controlledActiveStep ?? internalStep;

    // Unified order form state
    const [bootstrap, setBootstrap] = useState<BootstrapState>({
        profileName: "hnm",
        butlerCoreIp: "172.29.14.21",
        platformCoreIp: "172.29.14.22",
        putMode: false,
    });
    const [categories, setCategories] = useState<CategoryProfile[]>(DEFAULT_CATEGORIES);
    const [inventory, setInventory] = useState<InventoryRow[]>([
        { sku: "SKU1001", quantity: 50 },
        { sku: "SKU1002", quantity: 12 },
        { sku: "SKU1003", quantity: 30 },
    ]);
    const [templates, setTemplates] = useState<TemplateItem[]>(TEMPLATES);

    const currentIndex = STEPS.findIndex((step) => step.id === activeStep);
    const currentStep = STEPS[currentIndex] ?? STEPS[0];
    const meta = STEP_META[activeStep] ?? STEP_META[1];

    // Console log all form values of order reactively whenever any field changes
    useEffect(() => {
        console.log("=== All Order Form Values ===", {
            step: activeStep,
            stepName: currentStep.title,
            profile: bootstrap,
            categories,
            inventory,
            templates,
        });
    }, [activeStep, currentStep.title, bootstrap, categories, inventory, templates]);

    const setActiveStep = (step: number) => {
        if (onStepChange) {
            onStepChange(step);
        } else {
            setInternalStep(step);
        }
    };

    function goBack() {
        if (currentIndex > 0) setActiveStep(STEPS[currentIndex - 1].id);
    }

    function goNext() {
        console.log(`=== Order Form Values [Step ${activeStep} Complete -> Next] ===`, {
            step: activeStep,
            stepName: currentStep.title,
            profile: bootstrap,
            categories,
            inventory,
            templates,
        });
        if (currentIndex < STEPS.length - 1) setActiveStep(STEPS[currentIndex + 1].id);
    }

    return (
        <div className="flex min-h-screen w-full bg-[#0b0c10] text-white">
            <div className="flex-1 overflow-y-auto px-10 py-8">
                <div className={activeStep === 2 || activeStep === 4 || activeStep === 5 ? "max-w-4xl" : "max-w-2xl"}>
                    <p className="text-[11px] font-semibold tracking-widest text-white/40">
                        STEP {currentStep.id} &middot; {currentStep.title.toUpperCase()}
                    </p>
                    <h1 className="mt-2 text-[28px] font-bold text-white">{meta.heading}</h1>
                    <p className="mt-3 text-[15px] text-white/50">{meta.description}</p>

                    <div className="mt-8">
                        {activeStep === 1 && (
                            <Profile
                                bootstrap={bootstrap}
                                onChange={(val) => setBootstrap(val)}
                            />
                        )}

                        {activeStep === 2 && (
                            <Categories
                                categories={categories}
                                onChange={(val) => setCategories(val)}
                            />
                        )}

                        {activeStep === 3 && (
                            <Inventory
                                rows={inventory}
                                onRowsChange={(val) => setInventory(val)}
                            />
                        )}

                        {activeStep === 4 && (
                            <Template
                                templates={templates}
                                onChange={(val) => setTemplates(val)}
                            />
                        )}

                        {activeStep === 5 && (
                            <GeneratedForm
                                bootstrap={bootstrap}
                                categories={categories}
                                inventory={inventory}
                                templates={templates}
                            />
                        )}
                    </div>

                    <div className="mt-10 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={goBack}
                                disabled={currentIndex === 0}
                                className="h-11 border-white/10 bg-white/[0.03] px-5 text-white/70 hover:text-white cursor-pointer"
                            >
                                &larr; Back
                            </Button>
                            <Button
                                type="button"
                                onClick={goNext}
                                disabled={currentIndex === STEPS.length - 1}
                                className="h-11 bg-[var(--st-amber)] px-5 font-semibold text-black hover:opacity-90 cursor-pointer"
                            >
                                Next &rarr;
                            </Button>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                console.log("=== All Order Form Values (Manual Log) ===", {
                                    activeStep,
                                    stepName: currentStep.title,
                                    profile: bootstrap,
                                    categories,
                                    inventory,
                                    templates,
                                });
                            }}
                            className="h-11 border-white/10 bg-white/[0.03] px-4 font-mono text-xs text-white/60 hover:text-white hover:bg-white/5 cursor-pointer"
                        >
                            Log Form Values
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OrderGeneratorWizard;
