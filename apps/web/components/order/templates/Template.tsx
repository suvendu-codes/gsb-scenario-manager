"use client";

import React, { useState } from "react";
import { TemplateItem, TemplateProps } from "@/lib/types";
import { TEMPLATES } from "@/lib/data";
import { TemplateForm } from "./TemplateForm";

export function Template({ templates: controlledTemplates, onChange }: TemplateProps = {}) {
    const [internalTemplates, setInternalTemplates] = useState<TemplateItem[]>(TEMPLATES);
    const templates = controlledTemplates ?? internalTemplates;
    function updateTemplates(updater: (prev: TemplateItem[]) => TemplateItem[]) {
        const next = updater(templates);
        console.log("Order Templates Value:", next);
        if (onChange) {
            onChange(next);
        } else {
            setInternalTemplates(updater);
        }
    }
    function handleRemoveTextArea(id: string) {
        updateTemplates((prev) => prev.filter((item) => item.id !== id));
    }
    function handleTitleChange(id: string, newTitle: string) {
        updateTemplates((prev) =>
            prev.map((item) => (item.id === id ? { ...item, title: newTitle } : item))
        );
    }
    function handleContentChange(id: string, newContent: string) {
        updateTemplates((prev) =>
            prev.map((item) => (item.id === id ? { ...item, content: newContent } : item))
        );
    }
    function handleFormatJson(id: string) {
        updateTemplates((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;
                try {
                    const parsed = JSON.parse(item.content);
                    return { ...item, content: JSON.stringify(parsed, null, 2) };
                } catch {
                    return item;
                }
            })
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <TemplateForm
                templates={templates}
                onTitleChange={handleTitleChange}
                onContentChange={handleContentChange}
                onFormatJson={handleFormatJson}
                onRemoveTextArea={handleRemoveTextArea}
            />
        </div>
    );
}

export default Template;
