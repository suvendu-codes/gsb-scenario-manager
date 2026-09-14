"use client";

import Metrics from "@/components/shared/Metrics";
import OrderGeneratorWizard from "@/components/order/OrderGenerator";
import AppWrapper from "@/Wrapper/AppWrapper";

const WrappedOrderGenerator = AppWrapper(OrderGeneratorWizard, "order-generator");

export default function OrderGeneratorPage() {
  return (
    <div className="flex min-h-screen w-full">
      <div className="min-w-0 flex-1">
        <WrappedOrderGenerator />
      </div>
      <Metrics />
    </div>
  );
}
