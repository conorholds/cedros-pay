import { useEffect, useLayoutEffect, useRef, type MutableRefObject, type ReactNode, type RefObject } from 'react';
import { m, useReducedMotion } from 'motion/react';
import { layoutSpring, opacityTransition } from '../../motion/presets';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface AdminDialogProps {
  children: ReactNode;
  describedBy?: string;
  labelledBy: string;
  onClose: () => void;
  size?: 'default' | 'large';
}

function focusableChildren(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.getAttribute('aria-hidden') !== 'true'
  );
}

function useDialogFocus(
  panelRef: RefObject<HTMLDivElement>,
  onCloseRef: MutableRefObject<() => void>
) {
  useEffect(() => {
    const invoker = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    if (!panel) return undefined;

    queueMicrotask(() => (focusableChildren(panel)[0] ?? panel).focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = focusableChildren(panel);
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const current = focusable.indexOf(document.activeElement as HTMLElement);
      const next = event.shiftKey
        ? (current <= 0 ? focusable.length - 1 : current - 1)
        : (current === focusable.length - 1 ? 0 : current + 1);
      if (current === -1 || next !== current + (event.shiftKey ? -1 : 1)) {
        event.preventDefault();
        focusable[next]?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      queueMicrotask(() => invoker?.focus());
    };
  }, [onCloseRef, panelRef]);
}

export function AdminDialog({
  children,
  describedBy,
  labelledBy,
  onClose,
  size = 'default',
}: AdminDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion() === true;
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useDialogFocus(panelRef, onCloseRef);

  return (
    <m.div
      className="cedros-data-dialog__overlay cedros-admin__modal-overlay"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={opacityTransition}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <m.div
        ref={panelRef}
        className={`cedros-data-dialog cedros-admin__modal ${size === 'large' ? 'cedros-admin__modal--lg' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ ...layoutSpring, opacity: opacityTransition }}
      >
        {children}
      </m.div>
    </m.div>
  );
}
