"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GeneratedFormProps, TemplateItem } from "@/lib/types";
import { TEMPLATES } from "@/lib/data";
import { Check, Copy, AlertCircle, Plus, Sparkles } from "lucide-react";

function getCombinedTemplates(templateList?: TemplateItem[]) {
    const list = templateList && templateList.length > 0 ? templateList : TEMPLATES;
    return list.map((template) => {
        try {
            return JSON.parse(template.content);
        } catch {
            return template.content;
        }
    });
}

export default function Form({
    bootstrap,
    categories,
    inventory,
    templates,
}: GeneratedFormProps = {}) {
    const [jsonContent, setJsonContent] = useState("");
    const [copied, setCopied] = useState(false);

    function updateContent(value: string) {
        setJsonContent(value);
    }

    function handleGenerateJson() {
        const combinedTemplates = getCombinedTemplates(templates);
        const payload = {
            profile: bootstrap?.profileName ?? "hnm",
            generatedAt: new Date().toISOString(),
            totalOrders: combinedTemplates.length,
            orders: combinedTemplates,
        };
        setJsonContent(JSON.stringify(payload, null, 2));
    }

    function handleAddTemplate() {
        const combinedTemplates = getCombinedTemplates(templates);
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
    }

    function handleCopy() {
        if (!jsonContent) return;
        navigator.clipboard.writeText(jsonContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
                        className="h-9 gap-1.5 bg-[var(--st-amber)] px-3.5 text-[12px] font-semibold text-black transition-opacity hover:opacity-90"
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        Generate JSON
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleCopy}
                        disabled={jsonContent.length === 0}
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
                        className="h-9 gap-1.5 border-dashed border-white/20 bg-transparent px-3 text-[12px] text-white/70 hover:border-white/40 hover:text-white"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add Template
                    </Button>
                </div>

                {/* Validation and line count metrics */}
                <div className="flex items-center gap-2.5">
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
                    className="min-h-[440px] w-full rounded-xl border-white/10 bg-black/40 p-4 font-mono text-[13px] leading-relaxed text-white/90 placeholder:text-white/20 focus-visible:border-[var(--st-amber)]/50 focus-visible:ring-1 focus-visible:ring-[var(--st-amber)]/20"
                />
            </div>
        </div>
    );
}

