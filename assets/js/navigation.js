export class NavigationManager {
  constructor() {
    this.projects = document.querySelectorAll(".project");
    this.currentProjectIndex = 0;
    this.isTransitioning = false;
    this.lastScrollTime = 0;
    this.scrollTimeout = null;
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

      if (this.currentProjectIndex < 0 || this.currentProjectIndex >= this.projects.length) {
        this.currentProjectIndex = 0;
      }

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
    const updateCurrentProject = () => {
      if (this.isTransitioning) return;

      const now = Date.now();
      this.lastScrollTime = now;

      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }

      this.scrollTimeout = setTimeout(() => {
        if (this.isTransitioning || Date.now() - this.lastScrollTime > 100) return;

        const windowHeight = window.innerHeight;
        let newProjectIndex = this.currentProjectIndex;

        this.projects.forEach((project, index) => {
          const rect = project.getBoundingClientRect();
          if (rect.top <= windowHeight / 2 && rect.bottom >= windowHeight / 2) {
            newProjectIndex = index;
          }
        });

        if (newProjectIndex !== this.currentProjectIndex) {
          this.currentProjectIndex = newProjectIndex;
        }

        this.updateClickZones();
      }, 50);
    };

    window.addEventListener("scroll", updateCurrentProject);
    updateCurrentProject();
  }

  updateClickZones() {
    const aboutSection = document.querySelector(".about-section");
    const aboutRect = aboutSection.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const isAboutVisible = aboutRect.top <= windowHeight / 2 && aboutRect.bottom >= windowHeight / 2;

    if (isAboutVisible) {
      this.clickZoneLeft.classList.remove("active");
      this.clickZoneRight.classList.remove("active");
    } else {
      this.clickZoneLeft.classList.add("active");
      this.clickZoneRight.classList.add("active");
    }
  }

  ensureValidProjectIndex() {
    if (this.currentProjectIndex < 0) {
      this.currentProjectIndex = 0;
    } else if (this.currentProjectIndex >= this.projects.length) {
      this.currentProjectIndex = this.projects.length - 1;
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
          }
        }
      }
    };

    window.addEventListener("hashchange", handlePermalink);
    handlePermalink();
  }

  setupAnchorLinks() {
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
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    this.ensureValidProjectIndex();

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

    this.ensureValidProjectIndex();

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
}
