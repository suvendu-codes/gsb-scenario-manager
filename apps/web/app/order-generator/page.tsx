"use client";

import { useState, useTransition } from "react";
import OrderHeader from "@/components/shared/OrderHeader";
import OrderSider from "@/components/shared/OrderSidebar";
import Metrics from "@/components/shared/Metrics";
import OrderGeneratorWizard from "@/components/order/OrderGenerator";

export default function OrderGeneratorPage() {
  const [activeStep, setActiveStep] = useState(1);
  const [isPending, startTransition] = useTransition();

  const handleStepChange = (step: number) => {
    startTransition(() => {
      setActiveStep(step);
    });
  };

  const handleResetAll = () => {
    // Reset all form/payload states when triggered
    console.log("Reset all order payload parameters");
    startTransition(() => {
      setActiveStep(1);
    });
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-[var(--st-bg)] font-sans text-[var(--st-text)]">
      <OrderHeader
        onReset={handleResetAll}
      />
      <div className="flex flex-1 overflow-hidden">
        <OrderSider activeStep={activeStep} onStepChange={handleStepChange} onReset={handleResetAll} />
        <main className={`min-w-0 min-h-0 flex-1 flex flex-col overflow-y-auto p-6 transition-opacity duration-200 ${isPending ? "opacity-70" : "opacity-100"}`}>
          {/* Order management main content area */}
          <OrderGeneratorWizard activeStep={activeStep} onStepChange={handleStepChange} />
        </main>
        <Metrics />
      </div>
    </div>
  );
}
