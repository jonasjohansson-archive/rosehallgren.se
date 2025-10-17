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
    let navigationContainer = null;

    if (!isWideScreen) {
      // Create navigation container with dots only
      navigationContainer = document.createElement("div");
      navigationContainer.className = "carousel-navigation";
      carousel.parentElement.appendChild(navigationContainer);

      // Add dots container
      const dotsContainer = document.createElement("div");
      dotsContainer.className = "carousel-dots";
      navigationContainer.appendChild(dotsContainer);

      // Create dots for each slide
      const slides = carousel.querySelectorAll(".slide");
      slides.forEach((_, index) => {
        const dot = document.createElement("button");
        dot.className = "carousel-dot";
        dot.setAttribute("data-slide", index);
        dot.setAttribute("aria-label", `Go to slide ${index + 1}`);
        dotsContainer.appendChild(dot);
      });

      // Add event listeners for dots
      dotsContainer.addEventListener("click", (e) => {
        if (e.target.classList.contains("carousel-dot")) {
          e.preventDefault();
          e.stopPropagation();
          const slideIndex = parseInt(e.target.getAttribute("data-slide"));
          this.goToSlide(carousel, slideIndex);
        }
      });
    }

    const updateNavigation = () => {
      if (!navigationContainer) return;
      const slides = carousel.querySelectorAll(".slide");

      // Calculate slide width based on screen size
      let slideWidth;
      if (window.innerWidth >= 1200) {
        // On large screens, slides are 50vw (half viewport width)
        slideWidth = window.innerWidth / 2;
      } else {
        // On smaller screens, slides are full carousel width
        slideWidth = carousel.offsetWidth;
      }

      const currentSlide = Math.round(carousel.scrollLeft / slideWidth);

      // Update active dot
      const dots = navigationContainer.querySelectorAll(".carousel-dot");
      dots.forEach((dot, index) => {
        dot.classList.toggle("active", index === currentSlide);
      });
    };

    carousel.addEventListener("scroll", updateNavigation);
    updateNavigation();

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
      startX = 0;
    });
  }

  setupClickEvents(carousel, isDragging) {
    // Click functionality removed - keeping only scroll behavior
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

  goToSlide(carousel, slideIndex) {
    if (this.isTransitioning) return;

    const slides = carousel.querySelectorAll(".slide");

    // Calculate slide width based on screen size
    let slideWidth;
    if (window.innerWidth >= 1200) {
      // On large screens, slides are 50vw (half viewport width)
      slideWidth = window.innerWidth / 2;
    } else {
      // On smaller screens, slides are full carousel width
      slideWidth = carousel.offsetWidth;
    }

    if (slideIndex >= 0 && slideIndex < slides.length) {
      carousel.scrollTo({
        left: slideIndex * slideWidth,
        behavior: "smooth",
      });
    }
  }
}
