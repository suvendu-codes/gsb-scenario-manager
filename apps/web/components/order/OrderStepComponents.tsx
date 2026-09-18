"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import {
    ProfileProps,
    CategoriesProps,
    InventoryProps,
    TemplateProps,
    GeneratedFormProps,
} from "@/lib/types";

function LoadingFallback({ label }: { label: string }) {
    return (
        <div className="flex h-48 items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] text-[13px] text-white/40">
            <span className="animate-pulse">Loading {label}...</span>
        </div>
    );
}

const ProfileStep = dynamic(() => import("./profile/ProfileContainer"));
const CategoriesStep = dynamic(() => import("./Categories/Categories"));
const InventoryStep = dynamic(() => import("./inventory/Inventory"));
const TemplateStep = dynamic(() => import("./templates/Template"));
const GeneratedFormStep = dynamic(() => import("./generated/Form"));

function DeferredStep({ label, children }: { label: string; children: ReactNode }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [shouldLoad, setShouldLoad] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        if (typeof IntersectionObserver === "undefined") {
            const fallbackTimer = window.setTimeout(() => setShouldLoad(true), 0);
            return () => window.clearTimeout(fallbackTimer);
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setShouldLoad(true);
                    observer.disconnect();
                }
            },
            { rootMargin: "400px 0px" }
        );

        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={containerRef}>
            {shouldLoad ? children : <LoadingFallback label={label} />}
        </div>
    );
}

export const Profile = (props: ProfileProps) => (
    <DeferredStep label="profile">
        <ProfileStep {...props} />
    </DeferredStep>
);

export const Categories = (props: CategoriesProps) => (
    <DeferredStep label="categories">
        <CategoriesStep {...props} />
    </DeferredStep>
);

export const Inventory = (props: InventoryProps) => (
    <DeferredStep label="inventory">
        <InventoryStep {...props} />
    </DeferredStep>
);

export const Template = (props: TemplateProps) => (
    <DeferredStep label="templates">
        <TemplateStep {...props} />
    </DeferredStep>
);

export const GeneratedForm = (props: GeneratedFormProps) => (
    <DeferredStep label="generator">
        <GeneratedFormStep {...props} />
    </DeferredStep>
);

export {
    Profile as ProfileStepComponent,
    Categories as CategoriesStepComponent,
    Inventory as InventoryStepComponent,
    Template as TemplateStepComponent,
    GeneratedForm as GeneratedFormStepComponent,
};

