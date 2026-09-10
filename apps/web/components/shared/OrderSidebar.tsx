"use client";

import { STEPS, Step } from "@/lib/data";
import { useState } from "react";
import { GiHamburgerMenu } from "react-icons/gi";
import { RotateCcw } from "lucide-react";

interface OrderSidebarProps {
    activeStep?: number;
    onStepChange?: (step: number) => void;
    onReset?: () => void;
}

export function OrderSidebar({
    activeStep: controlledActiveStep,
    onStepChange,
    onReset,
}: OrderSidebarProps = {}) {
    const [internalStep, setInternalStep] = useState(1);
    const [show, setShow] = useState(false);
    const activeStep = controlledActiveStep ?? internalStep;

    const handleStepClick = (stepId: number) => {
        if (onStepChange) {
            onStepChange(stepId);
        } else {
            setInternalStep(stepId);
        }
        setShow(false);
    };

    return (
        <>
            <div
                onClick={() => setShow(!show)}
                className="fixed right-5 top-5 z-50 bg-[#161A20] text-white text-3xl p-2 rounded-md hover:bg-[#b8381e] cursor-pointer lg:hidden shadow-lg transition-transform active:scale-95"
                role="button"
                aria-label="Toggle sidebar"
            >
                <GiHamburgerMenu />
            </div>

            {/* Mobile backdrop overlay */}
            {show && (
                <div
                    onClick={() => setShow(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
                    aria-hidden="true"
                />
            )}

            <aside
                className={`w-[100%] sm:w-[300px] lg:w-[300px] bg-[#161A20] min-h-screen fixed top-0 ${show ? "left-0" : "left-[-100%]"
                    } transition-all duration-100 p-4 flex flex-col justify-between lg:static lg:left-0 border-r border-white/10 text-[#fff] z-50 overflow-y-auto shrink-0`}
            >
                <div className="relative flex flex-col">
                    {/* Header in sidebar on sm screen */}
                    <div className="flex flex-col gap-3 pb-3 mb-3 border-b border-white/10 sm:hidden">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[13px] font-bold border border-[var(--st-amber)] bg-[rgba(217,164,65,0.16)] text-[var(--st-amber)]">
                                    S
                                </span>
                                <div className="leading-tight">
                                    <div className="text-[13px] font-semibold text-white">
                                        Order Payload Generator
                                    </div>
                                    <div className="text-[11px] text-white/50">
                                        load-test payload builder
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShow(false)}
                                className="text-white/40 hover:text-white p-1 rounded-md text-lg cursor-pointer"
                                aria-label="Close sidebar"
                            >
                                ✕
                            </button>
                        </div>

                        {onReset && (
                            <button
                                type="button"
                                onClick={() => {
                                    onReset();
                                    setShow(false);
                                }}
                                className="flex items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                            >
                                <RotateCcw className="h-3.5 w-3.5 text-white/60" />
                                Reset all parameters
                            </button>
                        )}
                    </div>

                    <div className="flex items-center justify-between mb-2">
                        <h2 className="px-1 text-[11px] font-semibold tracking-widest text-white/70">
                            STEPS
                        </h2>
                        <button
                            type="button"
                            onClick={() => setShow(false)}
                            className="hidden sm:inline-block lg:hidden text-white/40 hover:text-white p-1 rounded-md text-lg cursor-pointer"
                            aria-label="Close sidebar"
                        >
                            ✕
                        </button>
                    </div>

                    <ul className="flex flex-col">
                        {STEPS.map((step: Step) => {
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
                </div>
            </aside>
        </>
    );
}

export default OrderSidebar;
