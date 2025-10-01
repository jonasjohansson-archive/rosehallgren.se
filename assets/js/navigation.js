/* ========================================
   NAVIGATION FUNCTIONALITY
   ======================================== */

export class NavigationManager {
  constructor() {
    this.projects = document.querySelectorAll(".project");
    this.currentProjectIndex = 0;
    this.isTransitioning = false;
    this.clickZoneLeft = document.getElementById("click-zone-left");
    this.clickZoneRight = document.getElementById("click-zone-right");
    this.init();
  }

  init() {
    this.setupKeyboardNavigation();
    this.setupClickZones();
    this.setupScrollTracking();
    this.setupPermalinkHandling();
    this.setupAnchorLinks();
  }

  setupKeyboardNavigation() {
    document.addEventListener("keydown", (e) => {
      if (this.isTransitioning) return;

      // Get the currently visible project's carousel
      const currentProject = this.projects[this.currentProjectIndex];
      const currentCarousel = currentProject ? currentProject.querySelector(".project-carousel") : null;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          if (currentCarousel) {
            this.previousSlide(currentCarousel);
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (currentCarousel) {
            this.advanceSlide(currentCarousel);
          }
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
    });
  }

  setupClickZones() {
    const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (!isMobile) {
      this.clickZoneLeft.addEventListener("click", (e) => {
        // Only trigger if not clicking on a link or interactive element
        if (e.target.tagName === "A" || e.target.closest("a")) {
          return;
        }
        e.preventDefault();
        const currentProject = this.projects[this.currentProjectIndex];
        const currentCarousel = currentProject ? currentProject.querySelector(".project-carousel") : null;
        if (currentCarousel) {
          this.previousSlide(currentCarousel);
        }
      });

      this.clickZoneRight.addEventListener("click", (e) => {
        // Only trigger if not clicking on a link or interactive element
        if (e.target.tagName === "A" || e.target.closest("a")) {
          return;
        }
        e.preventDefault();
        const currentProject = this.projects[this.currentProjectIndex];
        const currentCarousel = currentProject ? currentProject.querySelector(".project-carousel") : null;
        if (currentCarousel) {
          this.advanceSlide(currentCarousel);
        }
      });
    }
  }

  setupScrollTracking() {
    // Update current project index on scroll
    const updateCurrentProject = () => {
      const windowHeight = window.innerHeight;
      let newProjectIndex = this.currentProjectIndex;

      this.projects.forEach((project, index) => {
        const rect = project.getBoundingClientRect();
        if (rect.top <= windowHeight / 2 && rect.bottom >= windowHeight / 2) {
          newProjectIndex = index;
        }
      });

      // If we've changed projects, reset the carousel to first slide
      if (newProjectIndex !== this.currentProjectIndex) {
        this.currentProjectIndex = newProjectIndex;
        const currentCarousel = this.projects[this.currentProjectIndex].querySelector(".project-carousel");
        if (currentCarousel) {
          currentCarousel.scrollTo({
            left: 0,
            behavior: "smooth",
          });
        }
      }

      // Enable/disable click zones based on current section
      this.updateClickZones();
    };

    // Listen for scroll events to update current project
    window.addEventListener("scroll", updateCurrentProject);
    updateCurrentProject();
  }

  updateClickZones() {
    const aboutSection = document.querySelector(".about-section");
    const aboutRect = aboutSection.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const isAboutVisible = aboutRect.top <= windowHeight / 2 && aboutRect.bottom >= windowHeight / 2;

    if (isAboutVisible) {
      // Disable click zones when on about section
      this.clickZoneLeft.classList.remove("active");
      this.clickZoneRight.classList.remove("active");
    } else {
      // Enable click zones when on project sections
      this.clickZoneLeft.classList.add("active");
      this.clickZoneRight.classList.add("active");
    }
  }

  setupPermalinkHandling() {
    const handlePermalink = () => {
      const hash = window.location.hash.substring(1);
      if (hash) {
        const targetProject = document.getElementById(hash);
        if (targetProject) {
          const projectIndex = Array.from(this.projects).indexOf(targetProject);
          if (projectIndex !== -1) {
            this.currentProjectIndex = projectIndex;
            targetProject.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });

            // Reset carousel to first slide
            setTimeout(() => {
              const carousel = targetProject.querySelector(".project-carousel");
              if (carousel) {
                carousel.scrollTo({
                  left: 0,
                  behavior: "smooth",
                });
              }
            }, 100);
          }
        }
      }
    };

    // Listen for hash changes
    window.addEventListener("hashchange", handlePermalink);
    // Handle initial permalink on page load
    handlePermalink();
  }

  setupAnchorLinks() {
    // Smooth scrolling for anchor links
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach((link) => {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute("href"));
        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      });
    });
  }

  advanceSlide(carousel) {
    if (this.isTransitioning) return;

    const slides = carousel.querySelectorAll(".slide");
    const slideWidth = carousel.offsetWidth;
    const currentSlide = Math.round(carousel.scrollLeft / slideWidth);

    if (currentSlide < slides.length - 1) {
      // Move to next slide with smooth scrolling
      carousel.scrollTo({
        left: (currentSlide + 1) * slideWidth,
        behavior: "smooth",
      });
    } else {
      // Move to next project
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
      // Move to previous project
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

      // Reset the new project's carousel to first slide
      setTimeout(() => {
        const newCarousel = this.projects[this.currentProjectIndex].querySelector(".project-carousel");
        if (newCarousel) {
          newCarousel.scrollTo({
            left: 0,
            behavior: "smooth",
          });
        }
      }, 100);
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

      // Reset the new project's carousel to first slide
      setTimeout(() => {
        const newCarousel = this.projects[this.currentProjectIndex].querySelector(".project-carousel");
        if (newCarousel) {
          newCarousel.scrollTo({
            left: 0,
            behavior: "smooth",
          });
        }
      }, 100);
    }

    setTimeout(() => {
      this.isTransitioning = false;
    }, 800);
  }
}
