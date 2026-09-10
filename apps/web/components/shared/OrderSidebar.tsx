"use client";

import { STEPS } from "@/lib/data";
import { useState } from "react";


interface OrderSidebarProps {
    activeStep?: number;
    onStepChange?: (step: number) => void;
}

export function OrderSidebar({
    activeStep: controlledActiveStep,
    onStepChange,
}: OrderSidebarProps = {}) {
    const [internalStep, setInternalStep] = useState(1);
    const activeStep = controlledActiveStep ?? internalStep;

    const handleStepClick = (stepId: number) => {
        if (onStepChange) {
            onStepChange(stepId);
        } else {
            setInternalStep(stepId);
        }
    };

    return (
        <aside className="flex w-64 shrink-0 flex-col min-h-screen border-r border-white/10 bg-[#161A20] text-[#fff] overflow-y-auto">
            <h2 className="px-4 pt-5 pb-3 text-[11px] font-semibold tracking-widest text-white/70">
                STEPS
            </h2>

            <ul className="flex flex-col">
                {STEPS.map((step: any) => {
                    const isActive = step.id === activeStep;
                    return (
                        <li key={step.id} className="relative">
                            {isActive && (
                                <span className="absolute left-0 top-0 h-full w-[3px] rounded-r-full bg-[var(--st-amber)]" />
                            )}
                            <button
                                type="button"
                                onClick={() => handleStepClick(step.id)}
                                className={`flex w-full items-start gap-3 px-4 py-4 text-left transition-colors ${isActive ? "bg-white/[0.04]" : "hover:bg-white/[0.03]"
                                    }`}
                            >
                                <span
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold ${isActive
                                        ? "bg-[var(--st-amber)] text-black"
                                        : "border border-white/10 bg-white/5 text-white/40"
                                        }`}
                                >
                                    {step.id}
                                </span>
                                <span className="flex flex-col gap-1 pt-0.5">
                                    <span
                                        className={
                                            isActive
                                                ? "text-[15px] font-semibold text-white"
                                                : "text-[15px] font-normal text-white/90"
                                        }
                                    >
                                        {step.title}
                                    </span>
                                    <span
                                        className={`font-mono text-[12px] ${isActive ? "text-white/50" : "text-white/25"
                                            }`}
                                    >
                                        {step.subtitle}
                                    </span>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </aside>
    );
}

export default OrderSidebar;
