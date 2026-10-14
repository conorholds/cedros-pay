import type { Transition, Variants } from 'motion/react';

/** Fast, interruptible feedback for controls that can change state repeatedly. */
export const interactiveSpring: Transition = {
  type: 'spring',
  stiffness: 520,
  damping: 38,
  mass: 0.8,
  restDelta: 0.001,
  restSpeed: 0.01,
};

/** Slightly softer spring for panels and other layout-scale movement. */
export const layoutSpring: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 34,
  mass: 0.9,
  restDelta: 0.01,
  restSpeed: 0.1,
};

export const opacityTransition: Transition = {
  type: 'tween',
  duration: 0.16,
  ease: [0.16, 1, 0.3, 1],
};

export const AXIS_DISTANCE_PX = 16;

export function axisOffset(direction: number, entering: boolean): number {
  if (direction === 0) return 0;
  return AXIS_DISTANCE_PX * (entering ? direction : -direction);
}

export interface AxisMotionContext {
  direction: number;
  reduced: boolean;
}

/** Pass the latest direction to panels that AnimatePresence is exiting. */
export const axisVariants: Variants = {
  enter: ({ direction, reduced }: AxisMotionContext) =>
    reduced ? { opacity: 1, x: 0 } : { opacity: 0, x: axisOffset(direction, true) },
  center: { opacity: 1, x: 0 },
  exit: ({ direction, reduced }: AxisMotionContext) =>
    reduced ? { opacity: 1, x: 0 } : { opacity: 0, x: axisOffset(direction, false) },
};
