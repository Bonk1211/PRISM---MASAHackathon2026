import { useEffect, useRef, useState } from 'react';

/**
 * AnimatedNumber — tween from previous value to next over `duration` ms.
 * Uses rAF; respects prefers-reduced-motion (snaps instantly).
 *
 * Used in Pipeline stage cards so KEY OUTPUT numbers animate when inputs
 * change, instead of just snapping.
 */
export function AnimatedNumber({
  value,
  format,
  duration = 360,
  className = '',
}: {
  value: number;
  format: (v: number) => string;
  duration?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !Number.isFinite(value)) {
      setShown(value);
      fromRef.current = value;
      return;
    }
    fromRef.current = shown;
    startRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const tick = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const elapsed = t - startRef.current;
      const k = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - k, 3);
      const next = fromRef.current + (value - fromRef.current) * eased;
      setShown(next);
      if (k < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <span className={className}>{format(shown)}</span>;
}
