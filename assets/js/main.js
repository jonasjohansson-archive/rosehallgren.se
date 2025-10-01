/* ========================================
   MAIN APPLICATION
   ======================================== */

import { initializePagePosition, shuffleProjects } from "./utils.js";
import { CarouselManager } from "./carousel.js";
import { NavigationManager } from "./navigation.js";
import { DebugManager } from "./debug.js";
import { ColorExtractor } from "./color-extractor.js";

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  console.log("Portfolio loaded");

  // Initialize page position
  initializePagePosition();

  // Shuffle projects on page load
  shuffleProjects();

  // Initialize managers
  const carouselManager = new CarouselManager();
  const navigationManager = new NavigationManager();
  const debugManager = new DebugManager();
  const colorExtractor = new ColorExtractor();

  // Initialize project colors
  colorExtractor.initializeProjectColors();

  // Set up event listeners for cross-module communication
  window.addEventListener("nextProject", () => {
    navigationManager.nextProject();
  });

  window.addEventListener("previousProject", () => {
    navigationManager.previousProject();
  });
});
