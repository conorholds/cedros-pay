declare module 'cedros:admin' {
  export interface ToastAction {
    label: string;
    onClick: () => void;
  }

  export interface ToastOptions {
    action?: ToastAction;
    description?: string;
    duration?: number;
    id?: string;
  }

  export interface ToastApi {
    (message: string, options?: ToastOptions): string;
    success(message: string, options?: ToastOptions): string;
    error(message: string, options?: ToastOptions): string;
    info(message: string, options?: ToastOptions): string;
    warning(message: string, options?: ToastOptions): string;
    message(message: string, options?: ToastOptions): string;
    dismiss(id?: string): void;
  }

  export const toast: ToastApi;
}
