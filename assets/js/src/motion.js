const REDUCE_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");

/** Scroll behaviour honouring the user's motion preference. */
export const motion = () => (REDUCE_MOTION.matches ? "auto" : "smooth");
