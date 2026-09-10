"use client";

import OrderHeader from "@/components/shared/OrderHeader";
import OrderSider from "@/components/shared/OrderSidebar";
import Metrics from "@/components/shared/Metrics";
import OrderGeneratorWizard from "@/components/order/OrderGenerator";

export default function OrderManagementPage() {

  const handleResetAll = () => {
    // Reset all form/payload states when triggered
    console.log("Reset all order payload parameters");
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-[var(--st-bg)] font-sans text-[var(--st-text)]">
      <OrderHeader
        onReset={handleResetAll}
      />
      <div className="flex flex-1 overflow-hidden">
        <OrderSider />
        <main className="min-w-0 min-h-0 flex-1 flex flex-col overflow-y-auto p-6">
          {/* Order management main content area */}
          <OrderGeneratorWizard />
        </main>
        <Metrics />
      </div>
    </div>
  );
}
