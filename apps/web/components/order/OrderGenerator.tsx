"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DEFAULT_CATEGORIES, TEMPLATES } from "@/lib/data";
import {useVirtualizer} from "@tanstack/react-virtual"
import {
    BootstrapState,
    CategoryProfile,
    InventoryRow,
    TemplateItem,
} from "@/lib/types";
import { useApi } from "@/lib/hooks/useApi";
import { Profile, Categories, Inventory, Template, GeneratedForm } from "./OrderStepComponents";
import { InventoryResponse } from "@/lib/types";

// const Profile = lazy(() => import("./OrderStepComponents").then((module) => ({ default: module.Profile })));
// const Categories = lazy(() => import("./OrderStepComponents").then((module) => ({ default: module.Categories })));
// const Inventory = lazy(() => import("./OrderStepComponents").then((module) => ({ default: module.Inventory })));
// const Template = lazy(() => import("./OrderStepComponents").then((module) => ({ default: module.Template })));
// const GeneratedForm = lazy(() => import("./OrderStepComponents").then((module) => ({ default: module.GeneratedForm })));

// function SectionLoading({ label }: { label: string }) {
//     return (
//         <div className="flex h-48 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-[13px] text-white/40">
//             <span className="animate-pulse">Loading {label}...</span>
//         </div>
//     );
// }


const DEFAULT_BOOTSTRAP: BootstrapState = {
    profileName: "hnm",
    butlerCoreIp: "172.29.14.21",
    platformCoreIp: "172.29.14.22",
    putMode: false,
};

const DEFAULT_INVENTORY: InventoryRow[] = [
    { sku: "SKU1001", quantity: 50 },
    { sku: "SKU1002", quantity: 12 },
    { sku: "SKU1003", quantity: 30 },
];

export function OrderGeneratorWizard() {
    const [bootstrap, setBootstrap] = useState(DEFAULT_BOOTSTRAP);
    const [categories, setCategories] = useState<CategoryProfile[]>(DEFAULT_CATEGORIES);
    const [inventory, setInventory] = useState<InventoryRow[]>(DEFAULT_INVENTORY);
    const [templates, setTemplates] = useState<TemplateItem[]>(TEMPLATES);
    const { request } = useApi<InventoryResponse>();

    useEffect(() => {
        let isMounted = true;

        request({ method: "GET", url: "/api/inventory" })
            .then((response) => {
                if (isMounted && response) setInventory(response.inventory);
            })
            .catch(() => undefined);

        return () => {
            isMounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Console log all form values of order reactively whenever any field changes
    useEffect(() => {
        console.log("=== All Order Form Values ===", {
            profile: bootstrap,
            categories,
            inventory,
            templates,
        });
    }, [bootstrap, categories, inventory, templates]);

    return (
        <div className="w-full bg-[#0b0c10] px-10 py-8 text-white">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-12">
                <motion.section
                    id="order-step-1"
                    whileInView={{ opacity: [0, 1] }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                >
                    <p className="text-[11px] font-semibold tracking-widest text-white/40">01 · BOOTSTRAP</p>
                    <h1 className="mt-2 text-[28px] font-bold text-white">Pick the test profile</h1>
                    <p className="mt-3 text-[15px] text-white/50">Choose the named scenario for this order payload.</p>
                    <div className="mt-8"><Profile bootstrap={bootstrap} onChange={setBootstrap} /></div>
                </motion.section>

                <motion.section
                    id="order-step-2"
                    whileInView={{ opacity: [0, 1] }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                >
                    <p className="text-[11px] font-semibold tracking-widest text-white/40">02 · CATEGORIES</p>
                    <h2 className="mt-2 text-[28px] font-bold text-white">Define demand per category</h2>
                    <div className="mt-8"><Categories categories={categories} onChange={setCategories} /></div>
                </motion.section>

                <motion.section
                    id="order-step-3"
                    whileInView={{ opacity: [0, 1] }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                >
                    <p className="text-[11px] font-semibold tracking-widest text-white/40">03 · MOCK INVENTORY</p>
                    <h2 className="mt-2 text-[28px] font-bold text-white">Stand in for a live inventory snapshot</h2>
                    <div className="mt-8"><Inventory rows={inventory} onRowsChange={setInventory} /></div>
                </motion.section>

                <motion.section
                    id="order-step-4"
                    whileInView={{ opacity: [0, 1] }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                >
                    <p className="text-[11px] font-semibold tracking-widest text-white/40">04 · JSON TEMPLATES</p>
                    <h2 className="mt-2 text-[28px] font-bold text-white">The skeleton to stamp values into</h2>
                    <div className="mt-8"><Template templates={templates} onChange={setTemplates} /></div>
                </motion.section>

                <motion.section
                    id="order-step-5"
                    whileInView={{ opacity: [0, 1] }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                >
                    <p className="text-[11px] font-semibold tracking-widest text-white/40">05 · GENERATE &amp; PREVIEW</p>
                    <h2 className="mt-2 text-[28px] font-bold text-white">The generated payload</h2>
                    <div className="mt-8">
                        <GeneratedForm
                            bootstrap={bootstrap}
                            categories={categories}
                            inventory={inventory}
                            templates={templates}
                        />
                    </div>
                </motion.section>
            </div>
        </div>
    );
}

export default OrderGeneratorWizard;
