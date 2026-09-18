// Loaded on demand by the Sidebar's nested LazyMotion. `layoutId` needs the layout feature,
// which ships in domMax, not in the domAnimation bundle the app loads up front. The dynamic
// import keeps drag + layout projection out of the main chunk.
export { domMax as default } from "motion/react";
