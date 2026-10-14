import { useEffect, useRef } from 'react';

const EDGE_EPSILON_PX = 2;

/**
 * Exposes scroll-boundary state to CSS without intercepting wheel or touch
 * input. Native overscroll remains intact while the edge fade gives users a
 * proximity cue before they reach either boundary.
 */
export function useScrollEdges<T extends HTMLElement>(active = true) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active) return;
    const element = ref.current;
    if (!element) return;

    const update = () => {
      const maxScrollTop = Math.max(0, element.scrollHeight - element.clientHeight);
      element.dataset.atScrollStart = String(element.scrollTop <= EDGE_EPSILON_PX);
      element.dataset.atScrollEnd = String(
        maxScrollTop - element.scrollTop <= EDGE_EPSILON_PX
      );
    };

    update();
    element.addEventListener('scroll', update, { passive: true });
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(update);
    resizeObserver?.observe(element);
    const mutationObserver = typeof MutationObserver === 'undefined'
      ? null
      : new MutationObserver(update);
    mutationObserver?.observe(element, { childList: true, subtree: true });

    return () => {
      element.removeEventListener('scroll', update);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [active]);

  return ref;
}
