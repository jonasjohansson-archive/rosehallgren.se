export class CarouselManager {
  constructor() {
    this.carousels = document.querySelectorAll(".project-carousel");
    this.isTransitioning = false;
    this.init();
  }

  init() {
    this.carousels.forEach((carousel) => {
      this.initializeCarousel(carousel);
    });
  }

  initializeCarousel(carousel) {
    let startX = 0;
    let scrollLeft = 0;
    let isDown = false;
    let isDragging = false;

    const isWideScreen = window.innerWidth >= 1200;
    let slideCounter = null;

    if (!isWideScreen) {
      slideCounter = document.createElement("div");
      slideCounter.className = "slide-counter";
      carousel.parentElement.appendChild(slideCounter);
    }

    const updateSlideCounter = () => {
      if (!slideCounter) return;
      const slides = carousel.querySelectorAll(".slide");
      const slideWidth = carousel.offsetWidth;
      const currentSlide = Math.round(carousel.scrollLeft / slideWidth) + 1;
      slideCounter.textContent = `${currentSlide}/${slides.length}`;
    };

    carousel.addEventListener("scroll", updateSlideCounter);
    updateSlideCounter();

    this.setupImageSlides(carousel);
    this.setupMouseEvents(carousel, startX, scrollLeft, isDown, isDragging);
    this.setupTouchEvents(carousel, startX, isDragging);
    this.setupClickEvents(carousel, isDragging);

    carousel.setAttribute("tabindex", "0");
    carousel.style.cursor = "grab";
  }

  setupImageSlides(carousel) {
    const imageSlides = carousel.querySelectorAll(".image-slide");

    imageSlides.forEach((slide) => {
      const img = slide.querySelector("img");
      if (img) {
        if (img.complete) {
          slide.style.setProperty("--bg-image", `url(${img.src})`);
        } else {
          img.addEventListener("load", () => {
            slide.style.setProperty("--bg-image", `url(${img.src})`);
          });
        }
      }
    });
  }

  setupMouseEvents(carousel, startX, scrollLeft, isDown, isDragging) {
    carousel.addEventListener("mousedown", (e) => {
      isDown = true;
      isDragging = false;
      carousel.style.cursor = "grabbing";
      startX = e.pageX - carousel.offsetLeft;
      scrollLeft = carousel.scrollLeft;
    });

    carousel.addEventListener("mouseleave", () => {
      isDown = false;
      carousel.style.cursor = "grab";
    });

    carousel.addEventListener("mouseup", (e) => {
      isDown = false;
      carousel.style.cursor = "grab";

      if (!isDragging) {
        this.advanceSlide(carousel);
      }
    });

    carousel.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      isDragging = true;
      e.preventDefault();
      const x = e.pageX - carousel.offsetLeft;
      const walk = (x - startX) * 2;
      carousel.scrollLeft = scrollLeft - walk;
    });
  }

  setupTouchEvents(carousel, startX, isDragging) {
    carousel.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
      isDragging = false;
    });

    carousel.addEventListener("touchmove", (e) => {
      if (!startX) return;
      isDragging = true;
      const currentX = e.touches[0].clientX;
      const diffX = startX - currentX;
      carousel.scrollLeft += diffX;
      startX = currentX;
    });

    carousel.addEventListener("touchend", (e) => {
      if (!isDragging) {
        this.advanceSlide(carousel);
      }
      startX = 0;
    });
  }

  setupClickEvents(carousel, isDragging) {
    const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (!isMobile) {
      let mouseDownButton = null;

      carousel.addEventListener("mousedown", (e) => {
        mouseDownButton = e.button;
      });

      carousel.addEventListener("mouseup", (e) => {
        if (mouseDownButton === 0 && e.button === 0 && !isDragging) {
          if (e.target.tagName === "A" || e.target.closest("a") || e.target.closest(".slide-content")) {
            return;
          }

          const rect = carousel.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const centerX = rect.width / 2;

          if (clickX < centerX) {
            this.previousSlide(carousel);
          } else {
            this.advanceSlide(carousel);
          }
        }
        mouseDownButton = null;
      });

      carousel.addEventListener("contextmenu", (e) => {
        e.preventDefault();
      });
    }
  }

  advanceSlide(carousel) {
    if (this.isTransitioning) return;

    const slides = carousel.querySelectorAll(".slide");
    const slideWidth = carousel.offsetWidth;
    const currentSlide = Math.round(carousel.scrollLeft / slideWidth);

    if (currentSlide < slides.length - 1) {
      carousel.scrollTo({
        left: (currentSlide + 1) * slideWidth,
        behavior: "smooth",
      });
    } else {
      this.nextProject();
    }
  }

  previousSlide(carousel) {
    if (this.isTransitioning) return;

    const slideWidth = carousel.offsetWidth;
    const currentSlide = Math.round(carousel.scrollLeft / slideWidth);

    if (currentSlide > 0) {
      carousel.scrollTo({
        left: (currentSlide - 1) * slideWidth,
        behavior: "smooth",
      });
    } else {
      this.previousProject();
    }
  }

  nextProject() {
    window.dispatchEvent(new CustomEvent("nextProject"));
  }

  previousProject() {
    window.dispatchEvent(new CustomEvent("previousProject"));
  }
}
