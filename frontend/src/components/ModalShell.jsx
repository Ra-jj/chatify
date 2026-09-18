import { useId, useRef } from "react";
import { AnimatePresence, useIsPresent, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { X } from "lucide-react";
import IconButton from "./IconButton";
import { OVERLAY_EXIT_TRANSITION, OVERLAY_TRANSITION } from "../lib/motionTransitions";
import { useDialogFocus } from "../lib/useDialogFocus";

const ModalLayer = ({
  title,
  icon,
  onClose,
  onBackdropClick,
  footer,
  children,
  zIndexClassName,
  panelClassName,
}) => {
  const titleId = useId();
  // False while the exit animation plays; the closing modal must not take clicks meanwhile
  const isPresent = useIsPresent();
  // skipAnimations still paints `initial` for one frame; reduced motion should not flash at all
  const prefersReducedMotion = useReducedMotion();
  const panelRef = useRef(null);
  useDialogFocus({ panelRef, isPresent, onClose });

  return (
    <m.div
      className={`fixed inset-0 ${zIndexClassName} flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm ${
        isPresent ? "" : "pointer-events-none"
      }`}
      onClick={onBackdropClick}
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1, transition: OVERLAY_TRANSITION }}
      exit={{ opacity: 0, transition: OVERLAY_EXIT_TRANSITION }}
    >
      <m.div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-2xl border border-base-content/10 bg-base-100 text-base-content shadow-xl focus:outline-none ${panelClassName}`}
        onClick={onBackdropClick ? (e) => e.stopPropagation() : undefined}
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: OVERLAY_TRANSITION }}
        exit={{ opacity: 0, scale: 0.97, y: 8, transition: OVERLAY_EXIT_TRANSITION }}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-base-content/10 pl-5 pr-3">
          <h2 id={titleId} className="flex min-w-0 items-center gap-2 text-base font-semibold">
            {icon}
            <span className="truncate">{title}</span>
          </h2>
          <IconButton label="Close" icon={X} onClick={onClose} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-base-content/10 px-5 py-3">
            {footer}
          </div>
        )}
      </m.div>
    </m.div>
  );
};

// Shared frame for every modal: blurred backdrop, hairline panel, header with close, optional footer.
// Always render it and toggle `isOpen`: it has to stay mounted for AnimatePresence to play the exit.
// While closing, AnimatePresence keeps showing the last content it was given.
// Pass `onBackdropClick` only for modals that already closed on an outside click.
const ModalShell = ({ isOpen, zIndexClassName = "z-50", panelClassName = "max-w-md", ...layerProps }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <ModalLayer
          key="modal"
          zIndexClassName={zIndexClassName}
          panelClassName={panelClassName}
          {...layerProps}
        />
      )}
    </AnimatePresence>
  );
};

export default ModalShell;
