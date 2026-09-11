export interface TemplateItem {
    id: string;
    title: string;
    content: string;
}

export interface TemplateProps {
    templates?: TemplateItem[];
    onChange?: (templates: TemplateItem[]) => void;
}

export interface TemplateFormProps {
    templates: TemplateItem[];
    onTitleChange: (id: string, newTitle: string) => void;
    onContentChange: (id: string, newContent: string) => void;
    onFormatJson: (id: string) => void;
    onRemoveTextArea: (id: string) => void;
}