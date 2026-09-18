"use client";

import { useState, type ComponentType } from 'react'
import OrderSidebar from '@/components/shared/OrderSidebar'
import OrderHeader from '@/components/shared/OrderHeader'
import type { OrderGeneratorWizardProps } from '@/lib/types'

const AppWrapper = <P extends object>(
  Component: ComponentType<P>,
  idName?: string,
  classNames?: string
) => {
  const StepAwareComponent = Component as unknown as ComponentType<
    P & Partial<OrderGeneratorWizardProps>
  >;

  const HOC = (props: P) => {
    const [resetVersion, setResetVersion] = useState(0);
    const [activeStep, setActiveStep] = useState(1);

    const handleReset = () => {
      setResetVersion((version) => version + 1);
    };

    return (
      <div
        id={idName}
        className={`flex h-screen w-full flex-col bg-[var(--st-bg)] font-sans text-[var(--st-text)] ${classNames ?? ''}`}
      >
        <OrderHeader onReset={handleReset} />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <OrderSidebar activeStep={activeStep} onStepChange={setActiveStep} onReset={handleReset} />
          <div className="min-w-0 min-h-0 flex-1 flex flex-col overflow-y-auto p-6">
            <StepAwareComponent
              {...props}
              activeStep={activeStep}
              onStepChange={setActiveStep}
              key={resetVersion}
            />
          </div>
        </div>

        {/* <NavigationDots active={idName} /> */}
      </div>
    )
  }

  return HOC
}

export default AppWrapper
