// Shared Motion timings. Calm ease-outs, no bounce: overlays settle in about 200ms.
const OVERLAY_EASE = [0.22, 1, 0.36, 1];

export const OVERLAY_TRANSITION = { duration: 0.2, ease: OVERLAY_EASE };
export const OVERLAY_EXIT_TRANSITION = { duration: 0.15, ease: "easeIn" };

// New chat messages and composer chips
export const ENTER_TRANSITION = { duration: 0.2, ease: OVERLAY_EASE };
