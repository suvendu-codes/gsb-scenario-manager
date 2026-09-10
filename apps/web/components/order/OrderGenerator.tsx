"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { STEP_META } from "./steps";
import { STEPS } from "@/lib/data";
import DynamicLazy from "@/lib/LazyLoad";

const Profile = () => (
    <DynamicLazy
        importFunc={() => import("./profile/profile")}
        fallback={
            <div className="flex h-48 items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] text-[13px] text-white/40">
                <span className="animate-pulse">Loading profile...</span>
            </div>
        }
    />
);
const Categories = () => (
    <DynamicLazy
        importFunc={() => import("./Categories/Categories")}
        fallback={
            <div className="flex h-48 items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] text-[13px] text-white/40">
                <span className="animate-pulse">Loading categories...</span>
            </div>
        }
    />
);
const Inventory = () => (
    <DynamicLazy
        importFunc={() => import("./Inventory")}
        fallback={
            <div className="flex h-48 items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] text-[13px] text-white/40">
                <span className="animate-pulse">Loading inventory...</span>
            </div>
        }
    />
);
const Template = () => (
    <DynamicLazy
        importFunc={() => import("./templates/Template")}
        fallback={
            <div className="flex h-48 items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] text-[13px] text-white/40">
                <span className="animate-pulse">Loading templates...</span>
            </div>
        }
    />
);

export function OrderGeneratorWizard() {
    const [activeStep, setActiveStep] = useState(1);
    const currentIndex = STEPS.findIndex((step) => step.id === activeStep);
    const currentStep = STEPS[currentIndex];
    const meta = STEP_META[activeStep];
    function goBack() {
        if (currentIndex > 0) setActiveStep(STEPS[currentIndex - 1].id);
    }
    function goNext() {
        if (currentIndex < STEPS.length - 1) setActiveStep(STEPS[currentIndex + 1].id);
    }
    return (
        <div className="flex min-h-screen w-full bg-[#0b0c10] text-white">
            <div className="flex-1 overflow-y-auto px-10 py-8">
                <div className={activeStep === 2 || activeStep === 4 ? "max-w-4xl" : "max-w-2xl"}>
                    <p className="text-[11px] font-semibold tracking-widest text-white/40">
                        STEP {currentStep.id} &middot; {currentStep.title.toUpperCase()}
                    </p>
                    <h1 className="mt-2 text-[28px] font-bold text-white">{meta.heading}</h1>
                    <p className="mt-3 text-[15px] text-white/50">{meta.description}</p>

                    <div className="mt-8">
                        {activeStep === 1 && <Profile />}

                        {activeStep === 2 && <Categories />}

                        {activeStep === 3 && <Inventory />}

                        {activeStep === 4 && <Template />}
                    </div>

                    <div className="mt-10 flex items-center gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={goBack}
                            disabled={currentIndex === 0}
                            className="h-11 border-white/10 bg-white/[0.03] px-5 text-white/70 hover:text-white"
                        >
                            &larr; Back
                        </Button>
                        <Button
                            type="button"
                            onClick={goNext}
                            disabled={currentIndex === STEPS.length - 1}
                            className="h-11 bg-[var(--st-amber)] px-5 font-semibold text-black hover:opacity-90"
                        >
                            Next &rarr;
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OrderGeneratorWizard;
