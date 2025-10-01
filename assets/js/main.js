import { initializePagePosition, shuffleProjects } from "./utils.js";
import { CarouselManager } from "./carousel.js";
import { NavigationManager } from "./navigation.js";
import { DebugManager } from "./debug.js";
import { ColorExtractor } from "./color-extractor.js";

document.addEventListener("DOMContentLoaded", function () {
  console.log("Portfolio loaded");

  initializePagePosition();
  shuffleProjects();

  const carouselManager = new CarouselManager();
  const navigationManager = new NavigationManager();
  const debugManager = new DebugManager();
  const colorExtractor = new ColorExtractor();

  colorExtractor.initializeProjectColors();

  window.addEventListener("nextProject", () => {
    navigationManager.nextProject();
  });

  window.addEventListener("previousProject", () => {
    navigationManager.previousProject();
  });
});
