"use client";

import { Button } from "@/components/ui/button";
import { OrderNavigationProps } from "@/lib/types";

export function OrderNavigation({
    currentIndex,
    totalSteps,
    onBack,
    onNext,
    onLogValues,
}: OrderNavigationProps) {
    return (
        <div className="mt-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onBack}
                    disabled={currentIndex === 0}
                    className="h-11 border-white/10 bg-white/[0.03] px-5 text-white/70 hover:text-white cursor-pointer"
                >
                    &larr; Back
                </Button>
                <Button
                    type="button"
                    onClick={onNext}
                    disabled={currentIndex === totalSteps - 1}
                    className="h-11 bg-[var(--st-amber)] px-5 font-semibold text-black hover:opacity-90 cursor-pointer"
                >
                    Next &rarr;
                </Button>
            </div>

            {onLogValues && (
                <Button
                    type="button"
                    variant="outline"
                    onClick={onLogValues}
                    className="h-11 border-white/10 bg-white/[0.03] px-4 font-mono text-xs text-white/60 hover:text-white hover:bg-white/5 cursor-pointer"
                >
                    Log Form Values
                </Button>
            )}
        </div>
    );
}

export default OrderNavigation;
