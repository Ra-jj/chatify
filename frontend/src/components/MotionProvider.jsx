import { LazyMotion, MotionConfig, domAnimation, useReducedMotion } from "motion/react";

// One app-wide Motion setup.
// - LazyMotion + domAnimation keeps the main bundle small; components use `m.*` from "motion/react-m".
//   `strict` throws if a full `motion.*` component slips in and pulls every feature back into the bundle.
// - reducedMotion="user" only switches off transform/size animations (x, y, scale, height...);
//   opacity fades and their delays would still run. skipAnimations makes every animation jump
//   straight to its end state, so with prefers-reduced-motion everything appears instantly.
const MotionProvider = ({ children }) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" skipAnimations={Boolean(prefersReducedMotion)}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
};

export default MotionProvider;
