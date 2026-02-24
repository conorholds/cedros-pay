import * as React from 'react';
import { toast as sonnerToast, Toaster as SonnerToaster } from 'sonner';

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

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function useOptionalToast() {
  return React.useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toast = React.useCallback((data: Omit<ToastData, 'id'>) => {
    const title = data.title ?? '';
    const description = data.description;

    sonnerToast(title || description || 'Notification', {
      description: title ? description : undefined,
      duration: data.durationMs ?? 5000,
      action:
        data.actionLabel && data.onAction
          ? {
              label: data.actionLabel,
              onClick: () => data.onAction?.(),
            }
          : undefined,
    });
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <SonnerToaster
        position="top-center"
        closeButton
        expand
        className="toaster group"
        toastOptions={{
          classNames: {
            toast:
              'group toast group-[.toaster]:pointer-events-auto group-[.toaster]:w-full group-[.toaster]:rounded-xl group-[.toaster]:border group-[.toaster]:border-neutral-200 group-[.toaster]:bg-white group-[.toaster]:p-4 group-[.toaster]:shadow-lg dark:group-[.toaster]:border-neutral-800 dark:group-[.toaster]:bg-neutral-950',
            title: 'text-sm font-semibold text-neutral-950 dark:text-neutral-50',
            description: 'text-sm text-neutral-600 dark:text-neutral-400',
            actionButton:
              'h-8 rounded-md border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-900 shadow-sm hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50 dark:hover:bg-neutral-900',
            cancelButton:
              'h-8 rounded-md bg-neutral-100 px-3 text-xs font-medium text-neutral-900 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-50 dark:hover:bg-neutral-700',
            closeButton:
              'rounded-md text-neutral-600 opacity-0 transition-opacity hover:bg-neutral-100 hover:text-neutral-900 group-hover:opacity-100 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50',
          },
        }}
      />
    </ToastContext.Provider>
  );
}
