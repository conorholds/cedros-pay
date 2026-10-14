import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';

export interface AnimatedDisclosureProps {
  children: ReactNode;
  className?: string;
  open: boolean;
}

/**
 * Keeps disclosure content mounted so CSS can interpolate 0fr -> 1fr. The
 * closed subtree is inert as well as aria-hidden, preventing invisible form
 * controls from entering keyboard or assistive-technology navigation.
 */
export function AnimatedDisclosure({ children, className = '', open }: AnimatedDisclosureProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(open);
  const [expanded, setExpanded] = useState(open);
  const reduceMotion = useReducedMotion() === true;

  useEffect(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (frameRef.current !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(frameRef.current);
    }

    if (open) {
      setMounted(true);
      if (reduceMotion || typeof requestAnimationFrame !== 'function') {
        setExpanded(true);
      } else {
        frameRef.current = requestAnimationFrame(() => {
          frameRef.current = requestAnimationFrame(() => setExpanded(true));
        });
      }
    } else {
      setExpanded(false);
      if (reduceMotion) setMounted(false);
      else closeTimerRef.current = setTimeout(() => setMounted(false), 260);
    }

    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (frameRef.current !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [open, reduceMotion]);

  useLayoutEffect(() => {
    contentRef.current?.toggleAttribute('inert', !expanded);
  }, [expanded, mounted]);

  if (!mounted) return null;

  return (
    <div
      className={`cedros-admin__animated-disclosure ${expanded ? 'cedros-admin__animated-disclosure--open' : ''} ${className}`.trim()}
      aria-hidden={!expanded}
      data-state={expanded ? 'open' : 'closed'}
    >
      <div ref={contentRef} className="cedros-admin__animated-disclosure-clip">
        <div className="cedros-admin__animated-disclosure-content">{children}</div>
      </div>
    </div>
  );
}
