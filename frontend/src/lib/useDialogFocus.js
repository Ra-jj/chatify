import { useEffect, useRef, useState } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

// Open dialogs, innermost last. Only the top one reacts to Escape and Tab, so the lightbox opened
// from the contact-info modal closes on its own without closing the modal underneath.
const openDialogStack = [];

const getFocusableElements = (container) =>
  [...container.querySelectorAll(FOCUSABLE_SELECTOR)].filter((element) => element.getClientRects().length > 0);

// Keyboard behaviour for a modal dialog:
// - on open, focus moves into `panelRef` unless a child already took it (e.g. an autoFocus field)
// - Escape calls onClose; Tab and Shift+Tab cycle inside the panel
// - when closing starts (isPresent turns false, the exit animation plays), focus returns to
//   whatever was focused before the dialog opened
// `panelRef` must point at an element with tabIndex={-1}.
export const useDialogFocus = ({ panelRef, isPresent, onClose }) => {
  // Read during the first render, before React runs a child's autoFocus in the commit phase
  const [returnFocusTo] = useState(() => document.activeElement);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Runs on open and again when a closing dialog is reopened during its exit animation
  // (AnimatePresence re-enters the same layer instead of remounting it)
  useEffect(() => {
    if (!isPresent) return;
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) {
      const preferred = panel.querySelector("[data-autofocus]");
      (preferred ?? panel).focus({ preventScroll: true });
    }
  }, [isPresent, panelRef]);

  useEffect(() => {
    if (!isPresent) return undefined;
    const dialogToken = {};
    openDialogStack.push(dialogToken);

    const handleKeyDown = (event) => {
      const panel = panelRef.current;
      if (!panel || openDialogStack.at(-1) !== dialogToken) return;

      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = getFocusableElements(panel);
      const activeElement = document.activeElement;
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus({ preventScroll: true });
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!panel.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (activeElement === first || activeElement === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      const stackIndex = openDialogStack.indexOf(dialogToken);
      if (stackIndex !== -1) openDialogStack.splice(stackIndex, 1);
    };
  }, [isPresent, panelRef]);

  useEffect(() => {
    if (isPresent) return;
    if (returnFocusTo instanceof HTMLElement && returnFocusTo.isConnected) {
      returnFocusTo.focus({ preventScroll: true });
    }
  }, [isPresent, returnFocusTo]);
};
