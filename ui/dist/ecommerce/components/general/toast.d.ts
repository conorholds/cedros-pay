import * as React from 'react';
export type ToastData = {
    id: string;
    title?: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    durationMs?: number;
};
type ToastContextValue = {
    toast: (data: Omit<ToastData, 'id'>) => void;
};
export declare function useToast(): ToastContextValue;
export declare function useOptionalToast(): ToastContextValue | null;
export declare function ToastProvider({ children }: {
    children: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=toast.d.ts.map