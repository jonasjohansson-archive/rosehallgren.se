/**
 * Studio Rose Hallgren — portfolio behaviour.
 *
 * Entry point. The work is in Carousel (one project's slides) and Portfolio
 * (the page around them); this only starts it.
 *
 * Bundled to assets/js/main.js by scripts/build-js.js — edit the source here,
 * not the built file.
 */

import { Portfolio } from "./portfolio.js";

document.addEventListener("DOMContentLoaded", () => new Portfolio());
