import { useEffect, useRef } from 'react';

/**
 * Focus-trap hook for modal dialogs.
 *
 * On open: saves the previously-focused element, moves focus into the dialog
 * (first focusable child or the container itself), traps Tab/Shift+Tab inside
 * the dialog, and listens for Escape.
 *
 * On close: restores focus to the previously-focused element.
 *
 * Usage:
 *   const ref = useFocusTrap<HTMLDivElement>(isOpen, onClose);
 *   return <div ref={ref} role="dialog" aria-modal="true">…</div>;
 */
export function useFocusTrap<T extends HTMLElement>(
  active: boolean,
  onEscape?: () => void,
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!active || !ref.current) return;
    const node = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(
        node.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('inert') && el.offsetParent !== null);

    // Initial focus — first focusable, or the container with tabIndex=-1.
    const first = focusables()[0];
    if (first) {
      first.focus();
    } else {
      node.setAttribute('tabindex', '-1');
      node.focus();
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = focusables();
      if (list.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === firstEl || !node.contains(active)) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (active === lastEl || !node.contains(active)) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      // Restore focus to the trigger that opened us.
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [active, onEscape]);

  return ref;
}
