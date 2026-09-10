"use client";

import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Copy, AlertCircle, Trash2 } from "lucide-react";
import { TemplateItem } from "@/lib/types";

interface TemplateFormProps {
    templates: TemplateItem[];
    onTitleChange: (id: string, newTitle: string) => void;
    onContentChange: (id: string, newContent: string) => void;
    onFormatJson: (id: string) => void;
    onRemoveTextArea: (id: string) => void;
}

export function TemplateForm({
    templates,
    onTitleChange,
    onContentChange,
    onFormatJson,
    onRemoveTextArea,
}: TemplateFormProps) {
    const [copiedId, setCopiedId] = useState<string | null>(null);

    function handleCopy(id: string, content: string) {
        navigator.clipboard.writeText(content);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    }

    function validateJson(content: string): { isValid: boolean; error?: string } {
        try {
            JSON.parse(content);
            return { isValid: true };
        } catch (e: unknown) {
            return { isValid: false, error: (e as Error).message };
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {templates.map((template, index) => {
                const validation = validateJson(template.content);

                return (
                    <div
                        key={template.id}
                        className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-5 transition-colors focus-within:border-white/20"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex flex-1 items-center gap-2.5">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5 font-mono text-[11px] text-white/50">
                                    {index + 1}
                                </span>
                                <Input
                                    value={template.title}
                                    onChange={(e) => onTitleChange(template.id, e.target.value)}
                                    placeholder={`Template ${index + 1} Title`}
                                    className="h-9 max-w-sm border-white/10 bg-white/[0.03] text-[13px] font-medium text-white placeholder:text-white/30"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                {validation.isValid ? (
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

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onFormatJson(template.id)}
                                    className="h-8 border-white/10 bg-transparent px-2.5 text-[12px] text-white/60 hover:text-white"
                                    title="Format / Prettify JSON"
                                >
                                    Prettify
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCopy(template.id, template.content)}
                                    className="h-8 border-white/10 bg-transparent px-2.5 text-[12px] text-white/60 hover:text-white"
                                    title="Copy JSON"
                                >
                                    {copiedId === template.id ? (
                                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                                    ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                    )}
                                </Button>

                                {templates.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onRemoveTextArea(template.id)}
                                        className="h-8 border-white/10 bg-transparent px-2.5 text-[12px] text-rose-400/70 hover:bg-rose-500/10 hover:text-rose-400"
                                        title="Delete Template"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Shadcn Textarea in Loop */}
                        <Textarea
                            value={template.content}
                            onChange={(e) => onContentChange(template.id, e.target.value)}
                            rows={8}
                            placeholder="Paste or edit raw JSON template here..."
                            className="min-h-[160px] border-white/10 bg-black/40 font-mono text-[13px] leading-relaxed text-white/90 placeholder:text-white/20 focus-visible:border-[var(--st-amber)]/50 focus-visible:ring-1 focus-visible:ring-[var(--st-amber)]/20"
                        />
                    </div>
                );
            })}
        </div>
    );
}

export default TemplateForm;
