/**
 * Optimized Portfolio JavaScript - Consolidated and Performance Optimized
 * All functionality consolidated into a single, efficient module
 */

class OptimizedPortfolio {
  constructor() {
    this.isTransitioning = false;
    this.currentProjectIndex = 0;
    this.lastScrollTime = 0;
    this.scrollTimeout = null;
    this.resizeTimeout = null;
    this.projects = [];
    this.carousels = [];
    this.clickZoneLeft = null;
    this.clickZoneRight = null;

    this.init();
  }

  init() {
    this.cacheElements();
    this.shuffleProjects();
    this.setupEventListeners();
    this.initializeCarousels();
    this.setupColorExtraction();
    this.setupNavigation();
    this.optimizeImages();
    this.setupSocialSharing();
  }

  cacheElements() {
    this.projects = Array.from(document.querySelectorAll(".project"));
    this.carousels = Array.from(document.querySelectorAll(".project-carousel"));
    this.clickZoneLeft = document.getElementById("click-zone-left");
    this.clickZoneRight = document.getElementById("click-zone-right");
  }

  shuffleProjects() {
    if (this.projects.length <= 1) return;

    const aboutSection = document.querySelector(".about-section");
    const photographyProject = document.querySelector("#photography");
    const otherProjects = this.projects.filter((project) => project.id !== "photography");

    if (otherProjects.length <= 1) return;

    
    const shuffledProjects = [...otherProjects];
    for (let i = shuffledProjects.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledProjects[i], shuffledProjects[j]] = [shuffledProjects[j], shuffledProjects[i]];
    }

    
    otherProjects.forEach((project) => project.remove());

    
    shuffledProjects.forEach((project) => {
      photographyProject.insertAdjacentElement("beforebegin", project);
    });

    
    this.cacheElements();

    
    this.currentProjectIndex = 0;

    
    window.scrollTo({ top: 0, behavior: "auto" });

    
    console.log("Photography project:", photographyProject?.id);
    console.log("Other projects count:", otherProjects.length);
    console.log(
      "Shuffled projects:",
      shuffledProjects.map((p) => p.id || p.querySelector(".project-title")?.textContent)
    );

    
    setTimeout(() => {
      this.cacheElements(); 
      console.log(
        "Final order:",
        this.projects.map((p) => p.id || p.querySelector(".project-title")?.textContent)
      );
    }, 10);
  }

  setupEventListeners() {
    
    let scrollRAF = null;
    window.addEventListener("scroll", () => {
      if (scrollRAF) return;
      scrollRAF = requestAnimationFrame(() => {
        this.handleScroll();
        scrollRAF = null;
      });
    });

    
    document.addEventListener("keydown", (e) => this.handleKeyboard(e));

    
    if (this.clickZoneLeft && this.clickZoneRight) {
      this.clickZoneLeft.addEventListener("click", (e) => this.handleClickZone(e, "left"));
      this.clickZoneRight.addEventListener("click", (e) => this.handleClickZone(e, "right"));
    }

    
    let resizeTimeout;
    window.addEventListener("resize", () => {
      if (resizeTimeout) return;
      resizeTimeout = setTimeout(() => {
        this.handleResize();
        resizeTimeout = null;
      }, 250);
    });

    
    window.addEventListener("beforeunload", () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }

  initializeCarousels() {
    this.carousels.forEach((carousel) => {
      this.setupCarousel(carousel);
    });
  }

  setupCarousel(carousel) {
    let navigationContainer = null;

    
    navigationContainer = this.createNavigation(carousel);

    
    this.setupImageSlides(carousel);

    
    this.setupCarouselEvents(carousel, navigationContainer);

    
    if (navigationContainer) {
      this.setupNavigationUpdates(carousel, navigationContainer);
    }
  }

  createNavigation(carousel) {
    const navigationContainer = document.createElement("div");
    navigationContainer.className = "carousel-navigation";
    carousel.parentElement.appendChild(navigationContainer);

    const dotsContainer = document.createElement("div");
    dotsContainer.className = "carousel-dots";
    navigationContainer.appendChild(dotsContainer);

    const slides = carousel.querySelectorAll(".slide");
    slides.forEach((_, index) => {
      const dot = document.createElement("button");
      dot.className = "carousel-dot";
      dot.setAttribute("data-slide", index);
      dot.setAttribute("aria-label", `Go to slide ${index + 1}`);
      dotsContainer.appendChild(dot);
    });

    
    dotsContainer.addEventListener("click", (e) => {
      if (e.target.classList.contains("carousel-dot")) {
        e.preventDefault();
        e.stopPropagation();
        const slideIndex = parseInt(e.target.getAttribute("data-slide"));
        this.goToSlide(carousel, slideIndex);
      }
    });

    return navigationContainer;
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

  setupCarouselEvents(carousel, navigationContainer) {
    carousel.setAttribute("tabindex", "0");
  }

  setupNavigationUpdates(carousel, navigationContainer) {
    const updateNavigation = () => {
      const slides = carousel.querySelectorAll(".slide");
      const slideWidth = this.getSlideWidth();
      const currentSlide = Math.round(carousel.scrollLeft / slideWidth);

      const dots = navigationContainer.querySelectorAll(".carousel-dot");
      dots.forEach((dot, index) => {
        dot.classList.toggle("active", index === currentSlide);
      });
    };

    carousel.addEventListener("scroll", updateNavigation);
    updateNavigation();
  }

  getSlideWidth() {
    if (window.innerWidth >= 1200) {
      return window.innerWidth / 2;
    }
    return document.querySelector(".project-carousel")?.offsetWidth || window.innerWidth;
  }

  goToSlide(carousel, slideIndex) {
    if (this.isTransitioning) return;

    const slides = carousel.querySelectorAll(".slide");
    const slideWidth = this.getSlideWidth();

    if (slideIndex >= 0 && slideIndex < slides.length) {
      carousel.scrollTo({
        left: slideIndex * slideWidth,
        behavior: "smooth",
      });
    }
  }

  setupColorExtraction() {
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.extractColorFromImage(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    const images = document.querySelectorAll(".image-slide img");
    images.forEach((img) => observer.observe(img));
  }

  extractColorFromImage(img) {
    if (!img.complete) return;

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 1;
      canvas.height = 1;

      ctx.drawImage(img, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;

      const color = `rgb(${r}, ${g}, ${b})`;
      const lighterColor = `rgba(${r}, ${g}, ${b}, 0.3)`;

      
      const project = img.closest(".project");
      if (project) {
        
        const firstImage = project.querySelector(".image-slide img");
        if (img === firstImage) {
          
          const darkerColor = `rgba(${Math.max(0, r - 50)}, ${Math.max(0, g - 50)}, ${Math.max(0, b - 50)}, 0.8)`;
          project.style.setProperty("--project-logo-color", color);
          project.style.setProperty("--project-pagination-color", lighterColor);
          project.style.setProperty("--project-text-bg", darkerColor);
        }
      }

      
      document.documentElement.style.setProperty("--logo-color", color);
      document.documentElement.style.setProperty("--pagination-color", lighterColor);
    } catch (e) {
      
      document.documentElement.style.setProperty("--logo-color", "#000");
      document.documentElement.style.setProperty("--pagination-color", "rgba(0, 0, 0, 0.3)");
    }
  }

  setupNavigation() {
    this.updateCurrentProject();
    this.setupPermalinkHandling();
  }

  handleScroll() {
    if (this.isTransitioning) return;

    const now = Date.now();
    this.lastScrollTime = now;

    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    this.scrollTimeout = setTimeout(() => {
      if (this.isTransitioning || Date.now() - this.lastScrollTime > 100) return;
      this.updateCurrentProject();
    }, 50);
  }

  updateCurrentProject() {
    const windowHeight = window.innerHeight;
    let newProjectIndex = 0; 

    this.projects.forEach((project, index) => {
      const rect = project.getBoundingClientRect();
      if (rect.top <= windowHeight / 2 && rect.bottom >= windowHeight / 2) {
        newProjectIndex = index;
      }
    });

    
    newProjectIndex = Math.min(newProjectIndex, this.projects.length - 1);

    if (newProjectIndex !== this.currentProjectIndex) {
      this.currentProjectIndex = newProjectIndex;
      this.updateClickZones();
    }
  }

  updateClickZones() {
    const aboutSection = document.querySelector(".about-section");
    const aboutRect = aboutSection.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const isAboutVisible = aboutRect.top <= windowHeight / 2 && aboutRect.bottom >= windowHeight / 2;

    if (isAboutVisible) {
      this.clickZoneLeft?.classList.remove("active");
      this.clickZoneRight?.classList.remove("active");
    } else {
      this.clickZoneLeft?.classList.add("active");
      this.clickZoneRight?.classList.add("active");
    }
  }

  handleKeyboard(e) {
    if (this.isTransitioning) return;

    const currentProject = this.projects[this.currentProjectIndex];
    const currentCarousel = currentProject?.querySelector(".project-carousel");

    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        if (currentCarousel) this.previousSlide(currentCarousel);
        break;
      case "ArrowRight":
        e.preventDefault();
        if (currentCarousel) this.advanceSlide(currentCarousel);
        break;
      case "ArrowUp":
        e.preventDefault();
        this.previousProject();
        break;
      case "ArrowDown":
        e.preventDefault();
        this.nextProject();
        break;
    }
  }

  handleClickZone(e, direction) {
    if (e.target.tagName === "A" || e.target.closest("a")) return;

    e.preventDefault();
    const currentProject = this.projects[this.currentProjectIndex];
    const currentCarousel = currentProject?.querySelector(".project-carousel");

    if (currentCarousel) {
      if (direction === "left") {
        this.previousSlide(currentCarousel);
      } else {
        this.advanceSlide(currentCarousel);
      }
    }
  }

  advanceSlide(carousel) {
    if (this.isTransitioning) return;

    const slides = carousel.querySelectorAll(".slide");
    const slideWidth = this.getSlideWidth();
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

    const slideWidth = this.getSlideWidth();
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
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    if (this.currentProjectIndex < this.projects.length - 1) {
      this.currentProjectIndex++;
      this.projects[this.currentProjectIndex].scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }

    setTimeout(() => {
      this.isTransitioning = false;
    }, 800);
  }

  previousProject() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    if (this.currentProjectIndex > 0) {
      this.currentProjectIndex--;
      this.projects[this.currentProjectIndex].scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }

    setTimeout(() => {
      this.isTransitioning = false;
    }, 800);
  }

  setupPermalinkHandling() {
    const handlePermalink = () => {
      const hash = window.location.hash.substring(1);
      if (hash) {
        const targetProject = document.getElementById(hash);
        if (targetProject) {
          const projectIndex = this.projects.indexOf(targetProject);
          if (projectIndex !== -1) {
            this.currentProjectIndex = projectIndex;
            targetProject.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        }
      }
    };

    window.addEventListener("hashchange", handlePermalink);
    handlePermalink();
  }

  optimizeImages() {
    
    const images = document.querySelectorAll("img:not([loading])");
    images.forEach((img) => {
      img.setAttribute("loading", "lazy");
    });
  }

  setupSocialSharing() {
    
    this.updateSocialMetaTags();
    this.addSocialSharingButtons();
  }

  updateSocialMetaTags() {
    
    const currentProject = this.getCurrentProject();
    if (currentProject) {
      const projectName = currentProject.querySelector(".project-title")?.textContent || "Rose Hallgren";
      const projectImage =
        currentProject.querySelector("img")?.src || "https:

      
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) {
        ogImage.setAttribute("content", projectImage);
      }

      
      const twitterImage = document.querySelector('meta[name="twitter:image"]');
      if (twitterImage) {
        twitterImage.setAttribute("content", projectImage);
      }
    }
  }

  addSocialSharingButtons() {
    
    
    console.log("Social sharing optimization enabled");
  }

  handleResize() {
    
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      
      this.carousels.forEach((carousel) => {
        const navigationContainer = carousel.parentElement.querySelector(".carousel-navigation");
        if (navigationContainer) {
          this.setupNavigationUpdates(carousel, navigationContainer);
        }
      });
    }, 100);
  }
}


document.addEventListener("DOMContentLoaded", () => {
  new OptimizedPortfolio();
});
