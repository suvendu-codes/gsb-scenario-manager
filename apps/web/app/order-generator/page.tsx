"use client";

import { useState } from "react";
import OrderHeader from "@/components/shared/OrderHeader";
import OrderSider from "@/components/shared/OrderSidebar";
import Metrics from "@/components/shared/Metrics";
import OrderGeneratorWizard from "@/components/order/OrderGenerator";

export default function OrderGeneratorPage() {
  const [activeStep, setActiveStep] = useState(1);

  const handleStepChange = (step: number) => {
    setActiveStep(step);
  };

  const handleResetAll = () => {
    // Reset all form/payload states when triggered
    console.log("Reset all order payload parameters");
    setActiveStep(1);
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-[var(--st-bg)] font-sans text-[var(--st-text)]">
      <OrderHeader
        onReset={handleResetAll}
      />
      <div className="flex flex-1 overflow-hidden">
        <OrderSider activeStep={activeStep} onStepChange={handleStepChange} onReset={handleResetAll} />
        <main className="min-w-0 min-h-0 flex-1 flex flex-col overflow-y-auto p-6">
          {/* Order management main content area */}
          <OrderGeneratorWizard activeStep={activeStep} onStepChange={handleStepChange} />
        </main>
        <Metrics />
      </div>
    </div>
  );
}

