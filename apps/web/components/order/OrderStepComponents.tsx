"use client";

import React, { Suspense } from "react";
import {
    ProfileProps,
    CategoriesProps,
    InventoryProps,
    TemplateProps,
    GeneratedFormProps,
} from "@/lib/types";

const ProfileStep = React.lazy(() => import("./profile/profile"));
const CategoriesStep = React.lazy(() => import("./Categories/Categories"));
const InventoryStep = React.lazy(() => import("./inventory/Inventory"));
const TemplateStep = React.lazy(() => import("./templates/Template"));
const GeneratedFormStep = React.lazy(() => import("./generated/Form"));

function LoadingFallback({ label }: { label: string }) {
    return (
        <div className="flex h-48 items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] text-[13px] text-white/40">
            <span className="animate-pulse">Loading {label}...</span>
        </div>
    );
}

export const Profile = (props: ProfileProps) => (
    <Suspense fallback={<LoadingFallback label="profile" />}>
        <ProfileStep {...props} />
    </Suspense>
);

export const Categories = (props: CategoriesProps) => (
    <Suspense fallback={<LoadingFallback label="categories" />}>
        <CategoriesStep {...props} />
    </Suspense>
);

export const Inventory = (props: InventoryProps) => (
    <Suspense fallback={<LoadingFallback label="inventory" />}>
        <InventoryStep {...props} />
    </Suspense>
);

export const Template = (props: TemplateProps) => (
    <Suspense fallback={<LoadingFallback label="templates" />}>
        <TemplateStep {...props} />
    </Suspense>
);

export const GeneratedForm = (props: GeneratedFormProps) => (
    <Suspense fallback={<LoadingFallback label="generator" />}>
        <GeneratedFormStep {...props} />
    </Suspense>
);

export {
    Profile as ProfileStepComponent,
    Categories as CategoriesStepComponent,
    Inventory as InventoryStepComponent,
    Template as TemplateStepComponent,
    GeneratedForm as GeneratedFormStepComponent,
};

