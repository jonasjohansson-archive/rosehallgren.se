/* ========================================
   DEBUG UTILITIES
   ======================================== */

export class DebugManager {
  constructor() {
    this.carousels = document.querySelectorAll(".project-carousel");
    this.init();
  }

  init() {
    this.setupScrollIndicators();
  }

  setupScrollIndicators() {
    // Only show scroll indicators on smaller screens
    const isWideScreen = window.innerWidth >= 1200;
    if (isWideScreen) return;

    // Add scroll indicators (optional)
    const updateScrollIndicators = () => {
      this.carousels.forEach((carousel) => {
        const slides = carousel.querySelectorAll(".slide");
        const scrollLeft = carousel.scrollLeft;
        const slideWidth = carousel.offsetWidth;
        const currentSlide = Math.round(scrollLeft / slideWidth);

        // You can add visual indicators here if needed
        console.log(`Current slide: ${currentSlide + 1} of ${slides.length}`);
      });
    };

    // Update indicators on scroll
    this.carousels.forEach((carousel) => {
      carousel.addEventListener("scroll", updateScrollIndicators);
    });
  }
}
