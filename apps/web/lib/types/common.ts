import type { ComponentType, ReactNode } from "react";

export interface NumberFieldProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    suffix?: string;
}

export interface DynamicLazyProps<T extends object> {
    /**
     * Dynamic import function, e.g., () => import('./MyComponent')
     */
    importFunc: () => Promise<{ default: ComponentType<T> }>;
    /**
     * Optional custom loading component or element
     */
    fallback?: ReactNode;
    /**
     * Props to be passed directly to the loaded component
     */
    componentProps?: T;
}
