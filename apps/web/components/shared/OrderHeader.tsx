"use client";

import * as React from "react";
import { useMemo } from "react";
import { accentColor, accentFill, ACCENTS } from "@/components/shared/accent";
import { LaneAccent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface OrderHeaderProps {
    selectedAccent?: LaneAccent;
    onReset?: () => void;
    className?: string;
}

export function OrderHeader({
    selectedAccent = "amber",
    onReset,
    className = "",
}: OrderHeaderProps) {
    const accents = useMemo(() => ACCENTS, []);
    const activeAccent = useMemo(
        () => ({
            color: accentColor[selectedAccent],
            fill: accentFill[selectedAccent],
        }),
        [selectedAccent]
    );

    return (
        <header
            className={`flex items-center justify-between border-b border-[var(--st-border)] bg-[var(--st-panel)] px-4 py-2.5 font-sans text-[var(--st-text)] ${className}`}
        >
            {/* Left branding section */}
            <div className="flex items-center gap-3">
                <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[12px] font-bold border transition-colors"
                    style={{
                        backgroundColor: activeAccent.fill,
                        borderColor: activeAccent.color,
                        color: activeAccent.color,
                    }}
                >
                    S
                </span>
                <div className="leading-tight">
                    <div className="text-[13px] font-semibold tracking-tight text-[var(--st-text)]">
                        Order Payload Generator
                    </div>
                    <div className="text-[11px] text-[var(--st-text-mute)]">
                        load-test payload builder · POC · no live API calls
                    </div>
                </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-3">

                {/*  Reset All Button */}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onReset}
                    className="border-[var(--st-border)] bg-[var(--st-panel-2)] text-xs text-[var(--st-text-dim)] hover:bg-white/5 hover:text-[var(--st-text)] active:bg-white/10"
                >
                    <RotateCcw className="h-3.5 w-3.5 mr-1 text-[var(--st-text-mute)]" />
                    Reset all
                </Button>
            </div>
        </header>
    );
}

export default OrderHeader;
