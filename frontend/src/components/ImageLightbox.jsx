import { useRef } from "react";
import { AnimatePresence, useIsPresent, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { X } from "lucide-react";
import { OVERLAY_EXIT_TRANSITION, OVERLAY_TRANSITION } from "../lib/motionTransitions";
import { useDialogFocus } from "../lib/useDialogFocus";

const LightboxLayer = ({ src, alt, onClose, zIndexClassName }) => {
  const isPresent = useIsPresent();
  const prefersReducedMotion = useReducedMotion();
  const dialogRef = useRef(null);
  useDialogFocus({ panelRef: dialogRef, isPresent, onClose });

  return (
    <m.div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className={`fixed inset-0 ${zIndexClassName} flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm focus:outline-none sm:p-10 ${
        isPresent ? "" : "pointer-events-none"
      }`}
      onClick={onClose}
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1, transition: OVERLAY_TRANSITION }}
      exit={{ opacity: 0, transition: OVERLAY_EXIT_TRANSITION }}
    >
      <button
        type="button"
        aria-label="Close image"
        title="Close image"
        className="btn btn-circle btn-sm absolute right-4 top-4 z-10 border-base-content/10 bg-base-100/90 text-base-content hover:bg-base-100"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <X className="size-4" aria-hidden="true" />
      </button>

      <div className="relative flex h-full w-full max-w-5xl items-center justify-center">
        <m.img
          src={src}
          alt={alt}
          className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0, transition: OVERLAY_TRANSITION }}
          exit={{ opacity: 0, scale: 0.97, y: 8, transition: OVERLAY_EXIT_TRANSITION }}
        />
      </div>
    </m.div>
  );
};

// Full-screen image viewer. Clicking the backdrop or the close button closes it;
// clicking the image itself does not. Keep it mounted and toggle `isOpen` so the exit can play.
const ImageLightbox = ({ isOpen, src, alt, onClose, zIndexClassName = "z-50" }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <LightboxLayer key="lightbox" src={src} alt={alt} onClose={onClose} zIndexClassName={zIndexClassName} />
      )}
    </AnimatePresence>
  );
};

export default ImageLightbox;
