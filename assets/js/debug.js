export class DebugManager {
  constructor() {
    this.carousels = document.querySelectorAll(".project-carousel");
    this.init();
  }

  init() {
    this.setupScrollIndicators();
  }

  setupScrollIndicators() {
    const isWideScreen = window.innerWidth >= 1200;
    if (isWideScreen) return;

    const updateScrollIndicators = () => {
      this.carousels.forEach((carousel) => {
        const slides = carousel.querySelectorAll(".slide");
        const scrollLeft = carousel.scrollLeft;
        const slideWidth = carousel.offsetWidth;
        const currentSlide = Math.round(scrollLeft / slideWidth);

        console.log(`Current slide: ${currentSlide + 1} of ${slides.length}`);
      });
    };

    this.carousels.forEach((carousel) => {
      carousel.addEventListener("scroll", updateScrollIndicators);
    });
  }
}
