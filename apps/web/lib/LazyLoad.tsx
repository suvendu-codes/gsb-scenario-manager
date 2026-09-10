// DynamicLazy.tsx
import React, { ComponentType, LazyExoticComponent, Suspense, ReactNode, useMemo } from 'react';

interface DynamicLazyProps<T extends object> {
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

/**
 * A reusable wrapper for dynamically lazy loading components in React using TSX.
 */
export function DynamicLazy<T extends object>({
    importFunc,
    fallback = <div>Loading...</div>,
    componentProps,
}: DynamicLazyProps<T>): React.JSX.Element {
    // Memoize lazy component instantiation to prevent re-creation on parent re-renders
    const LazyComponent: LazyExoticComponent<ComponentType<T>> = useMemo(
        () => React.lazy(importFunc),
        [importFunc]
    );

    return (
        <Suspense fallback={fallback}>
            <LazyComponent {...(componentProps as T)} />
        </Suspense>
    );
}

export default DynamicLazy;