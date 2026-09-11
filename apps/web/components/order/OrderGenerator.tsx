"use client";

import { useReducer, useEffect } from "react";
import { STEP_META } from "./steps";
import { STEPS } from "@/lib/data";
import { OrderGeneratorWizardProps } from "@/lib/types";
import { initialOrderState, orderWizard } from "./order";
import { RenderStepContent } from "./RenderStepContent";
import { OrderNavigation } from "./OrderNavigation";

export function OrderGeneratorWizard({
    activeStep: controlledActiveStep,
    onStepChange,
}: OrderGeneratorWizardProps = {}) {
    const [state, dispatch] = useReducer(orderWizard, initialOrderState);
    const activeStep = controlledActiveStep ?? state.step;

    const { bootstrap, categories, inventory, templates } = state;

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
        dispatch({ type: "SET_STEP", payload: step });
        onStepChange?.(step);
    };

    function goBack() {
        if (currentIndex > 0) {
            const nextStepId = STEPS[currentIndex - 1].id;
            setActiveStep(nextStepId);
        }
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
        if (currentIndex < STEPS.length - 1) {
            const nextStepId = STEPS[currentIndex + 1].id;
            setActiveStep(nextStepId);
        }
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
                        <RenderStepContent
                            activeStep={activeStep}
                            bootstrap={bootstrap}
                            categories={categories}
                            inventory={inventory}
                            templates={templates}
                            dispatch={dispatch}
                        />
                    </div>

                    <OrderNavigation
                        currentIndex={currentIndex}
                        totalSteps={STEPS.length}
                        onBack={goBack}
                        onNext={goNext}
                        onLogValues={() => {
                            console.log("=== All Order Form Values (Manual Log) ===", {
                                activeStep,
                                stepName: currentStep.title,
                                profile: bootstrap,
                                categories,
                                inventory,
                                templates,
                            });
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

export default OrderGeneratorWizard;
