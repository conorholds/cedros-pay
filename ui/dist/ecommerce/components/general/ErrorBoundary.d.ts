import * as React from 'react';
export declare class ErrorBoundary extends React.Component<{
    children: React.ReactNode;
    fallback?: (error: Error) => React.ReactNode;
}, {
    error: Error | null;
}> {
    state: {
        error: Error | null;
    };
    static getDerivedStateFromError(error: Error): {
        error: Error;
    };
    render(): string | number | boolean | Iterable<React.ReactNode> | import("react/jsx-runtime").JSX.Element | null | undefined;
}
//# sourceMappingURL=ErrorBoundary.d.ts.map