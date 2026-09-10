"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TEMPLATES } from "@/lib/data";
import { Check, Copy, AlertCircle, Plus, Sparkles, Loader2 } from "lucide-react";

function getCombinedTemplates() {
    return TEMPLATES.map((template) => {
        try {
            return JSON.parse(template.content);
        } catch {
            return template.content;
        }
    });
}

import { BootstrapState, CategoryProfile, InventoryRow, TemplateItem } from "@/lib/types";

interface FormProps {
    bootstrap?: BootstrapState;
    categories?: CategoryProfile[];
    inventory?: InventoryRow[];
    templates?: TemplateItem[];
}

export default function Form({
    bootstrap,
    categories,
    inventory,
    templates,
}: FormProps = {}) {
    const [jsonContent, setJsonContent] = useState("");
    const [copied, setCopied] = useState(false);
    const [isPending, startTransition] = useTransition();

    function updateContent(value: string) {
        console.log("Order JSON Raw Content Value:", value);
        startTransition(() => {
            setJsonContent(value);
        });
    }

    function handleGenerateJson() {
        startTransition(() => {
            const templateList = templates && templates.length > 0 ? templates : TEMPLATES;
            const combinedTemplates = templateList.map((t) => {
                try {
                    return JSON.parse(t.content);
                } catch {
                    return t.content;
                }
            });
            const payload = {
                profile: bootstrap?.profileName ?? "hnm",
                bootstrap: bootstrap ?? {
                    profileName: "hnm",
                    butlerCoreIp: "172.29.14.21",
                    platformCoreIp: "172.29.14.22",
                    putMode: false,
                },
                categories: categories ?? [],
                inventory: inventory ?? [],
                generatedAt: new Date().toISOString(),
                totalOrders: combinedTemplates.length,
                orders: combinedTemplates,
            };
            console.log("=== Generated Order JSON Payload ===", payload);
            setJsonContent(JSON.stringify(payload, null, 2));
        });
    }

    function handleAddTemplate() {
        startTransition(() => {
            const combinedTemplates = getCombinedTemplates();
            try {
                if (jsonContent.trim().length > 0) {
                    const currentParsed = JSON.parse(jsonContent);
                    if (Array.isArray(currentParsed)) {
                        setJsonContent(JSON.stringify([...currentParsed, ...combinedTemplates], null, 2));
                    } else if (typeof currentParsed === "object" && currentParsed !== null) {
                        if (Array.isArray(currentParsed.orders)) {
                            currentParsed.orders.push(...combinedTemplates);
                            currentParsed.totalOrders = currentParsed.orders.length;
                            setJsonContent(JSON.stringify(currentParsed, null, 2));
                        } else {
                            setJsonContent(
                                JSON.stringify({ ...currentParsed, templates: combinedTemplates }, null, 2)
                            );
                        }
                    } else {
                        setJsonContent(JSON.stringify(combinedTemplates, null, 2));
                    }
                } else {
                    setJsonContent(JSON.stringify(combinedTemplates, null, 2));
                }
            } catch {
                setJsonContent(JSON.stringify(combinedTemplates, null, 2));
            }
        });
    }

    function handleCopy() {
        if (!jsonContent) return;
        console.log("=== Copied Order JSON Payload ===", jsonContent);
        navigator.clipboard.writeText(jsonContent);
        setCopied(true);
        startTransition(() => {
            setTimeout(() => setCopied(false), 2000);
        });
    }

    let isValid = true;
    if (jsonContent.trim().length > 0) {
        try {
            JSON.parse(jsonContent);
            isValid = true;
        } catch {
            isValid = false;
        }
    }
    const lineCount = jsonContent.length > 0 ? jsonContent.split("\n").length : 0;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Primary buttons: First Generate JSON, Second Copy JSON, then Add Template */}
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        onClick={handleGenerateJson}
                        disabled={isPending}
                        className="h-9 gap-1.5 bg-[var(--st-amber)] px-3.5 text-[12px] font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                        {isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                        )}
                        Generate JSON
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleCopy}
                        disabled={jsonContent.length === 0 || isPending}
                        className="h-9 gap-1.5 border-white/10 bg-white/[0.03] px-3.5 text-[12px] text-white/80 hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
                    >
                        {copied ? (
                            <>
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                            </>
                        ) : (
                            <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copy JSON</span>
                            </>
                        )}
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddTemplate}
                        disabled={isPending}
                        className="h-9 gap-1.5 border-dashed border-white/20 bg-transparent px-3 text-[12px] text-white/70 hover:border-white/40 hover:text-white disabled:opacity-50"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add Template
                    </Button>
                </div>

                {/* Validation and line count metrics */}
                <div className="flex items-center gap-2.5">
                    {isPending && (
                        <span className="font-mono text-[11px] text-[var(--st-amber)] animate-pulse">
                            Processing...
                        </span>
                    )}
                    <span className="font-mono text-[11px] text-white/40">
                        {lineCount} lines
                    </span>
                    {isValid ? (
                        <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-400">
                            <Check className="h-3 w-3" />
                            Valid JSON
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 font-mono text-[11px] text-rose-400">
                            <AlertCircle className="h-3 w-3" />
                            Invalid JSON
                        </span>
                    )}
                </div>
            </div>

            {/* Single Textarea */}
            <div className="relative">
                <Textarea
                    value={jsonContent}
                    onChange={(e) => updateContent(e.target.value)}
                    rows={20}
                    placeholder="Generated JSON payload appears here..."
                    className={`min-h-[440px] w-full rounded-xl border-white/10 bg-black/40 p-4 font-mono text-[13px] leading-relaxed text-white/90 placeholder:text-white/20 transition-opacity duration-200 focus-visible:border-[var(--st-amber)]/50 focus-visible:ring-1 focus-visible:ring-[var(--st-amber)]/20 ${isPending ? "opacity-60" : "opacity-100"
                        }`}
                />
            </div>
        </div>
    );
}
