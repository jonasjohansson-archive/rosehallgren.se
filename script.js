// Portfolio carousel functionality
document.addEventListener("DOMContentLoaded", function () {
  console.log("Portfolio loaded");

  // Check if device is mobile
  const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Shuffle projects on page load
  shuffleProjects();

  // Get all projects and carousels
  const projects = document.querySelectorAll(".project");
  const carousels = document.querySelectorAll(".project-carousel");
  let currentProjectIndex = 0;
  let isTransitioning = false;

  // Click zone navigation (disabled on mobile)
  const clickZoneLeft = document.getElementById("click-zone-left");
  const clickZoneRight = document.getElementById("click-zone-right");

  // Initialize carousels
  carousels.forEach((carousel, carouselIndex) => {
    let startX = 0;
    let scrollLeft = 0;
    let isDown = false;
    let isDragging = false;

    // Create slide counter
    const slideCounter = document.createElement("div");
    slideCounter.className = "slide-counter";
    carousel.parentElement.appendChild(slideCounter);

    // Function to update slide counter
    function updateSlideCounter() {
      const slides = carousel.querySelectorAll(".slide");
      const slideWidth = carousel.offsetWidth;
      const currentSlide = Math.round(carousel.scrollLeft / slideWidth) + 1;
      slideCounter.textContent = `${currentSlide}/${slides.length}`;
    }

    // Update counter on scroll
    carousel.addEventListener("scroll", updateSlideCounter);

    // Initial counter update
    updateSlideCounter();

    // Set background images for image slides and add project heading
    const imageSlides = carousel.querySelectorAll(".image-slide");

    // Project headings now handled by fixed header

    // Set background images for image slides
    imageSlides.forEach((slide) => {
      const img = slide.querySelector("img");
      if (img) {
        // Set background image immediately if already loaded
        if (img.complete) {
          slide.style.setProperty("--bg-image", `url(${img.src})`);
        } else {
          // Wait for image to load
          img.addEventListener("load", () => {
            slide.style.setProperty("--bg-image", `url(${img.src})`);
          });
        }
      }
    });

    // Mouse events for dragging
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

      // If not dragging, advance to next slide
      if (!isDragging) {
        advanceSlide(carousel);
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

    // Click events for left/right navigation (disabled on mobile)
    if (!isMobile) {
      carousel.addEventListener("click", (e) => {
        // Only trigger if not clicking on a link, interactive element, or text content
        if (e.target.tagName === "A" || e.target.closest("a") || e.target.closest(".slide-content")) {
          return;
        }

        // If not dragging, determine direction based on click position
        if (!isDragging) {
          const rect = carousel.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const centerX = rect.width / 2;

          if (clickX < centerX) {
            // Clicked on left side - go left
            previousSlide(carousel);
          } else {
            // Clicked on right side - go right
            advanceSlide(carousel);
          }
        }
      });
    }

    // Touch events
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
        advanceSlide(carousel);
      }
      startX = 0;
    });

    // Click to advance - removed, now handled by left/right click detection above

    // Make carousel focusable for keyboard navigation
    carousel.setAttribute("tabindex", "0");
    carousel.style.cursor = "grab";
  });

  // Function to advance to next slide
  function advanceSlide(carousel) {
    if (isTransitioning) return;

    const slides = carousel.querySelectorAll(".slide");
    const slideWidth = carousel.offsetWidth;
    const currentSlide = Math.round(carousel.scrollLeft / slideWidth);

    if (currentSlide < slides.length - 1) {
      // Move to next slide with smooth scrolling
      carousel.scrollTo({
        left: (currentSlide + 1) * slideWidth,
        behavior: "smooth",
        block: "nearest",
        inline: "start",
      });
    } else {
      // Move to next project
      nextProject();
    }
  }

  // Function to go to previous slide
  function previousSlide(carousel) {
    if (isTransitioning) return;

    const slideWidth = carousel.offsetWidth;
    const currentSlide = Math.round(carousel.scrollLeft / slideWidth);

    if (currentSlide > 0) {
      carousel.scrollTo({
        left: (currentSlide - 1) * slideWidth,
        behavior: "smooth",
        block: "nearest",
        inline: "start",
      });
    } else {
      // Move to previous project
      previousProject();
    }
  }

  // Function to go to next project
  function nextProject() {
    if (isTransitioning) return;
    isTransitioning = true;

    if (currentProjectIndex < projects.length - 1) {
      currentProjectIndex++;
      projects[currentProjectIndex].scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      // Reset the new project's carousel to first slide
      setTimeout(() => {
        const newCarousel = projects[currentProjectIndex].querySelector(".project-carousel");
        if (newCarousel) {
          newCarousel.scrollTo({
            left: 0,
            behavior: "smooth",
          });
        }
      }, 100);
    }

    setTimeout(() => {
      isTransitioning = false;
    }, 800);
  }

  // Function to go to previous project
  function previousProject() {
    if (isTransitioning) return;
    isTransitioning = true;

    if (currentProjectIndex > 0) {
      currentProjectIndex--;
      projects[currentProjectIndex].scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      // Reset the new project's carousel to first slide
      setTimeout(() => {
        const newCarousel = projects[currentProjectIndex].querySelector(".project-carousel");
        if (newCarousel) {
          newCarousel.scrollTo({
            left: 0,
            behavior: "smooth",
          });
        }
      }, 100);
    }

    setTimeout(() => {
      isTransitioning = false;
    }, 800);
  }

  // Global keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (isTransitioning) return;

    // Get the currently visible project's carousel
    const currentProject = projects[currentProjectIndex];
    const currentCarousel = currentProject ? currentProject.querySelector(".project-carousel") : null;

    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        if (currentCarousel) {
          previousSlide(currentCarousel);
        }
        break;
      case "ArrowRight":
        e.preventDefault();
        if (currentCarousel) {
          advanceSlide(currentCarousel);
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        previousProject();
        break;
      case "ArrowDown":
        e.preventDefault();
        nextProject();
        break;
    }
  });

  // Update current project index on scroll
  function updateCurrentProject() {
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    let newProjectIndex = currentProjectIndex;

    projects.forEach((project, index) => {
      const rect = project.getBoundingClientRect();
      if (rect.top <= windowHeight / 2 && rect.bottom >= windowHeight / 2) {
        newProjectIndex = index;
      }
    });

    // If we've changed projects, reset the carousel to first slide
    if (newProjectIndex !== currentProjectIndex) {
      currentProjectIndex = newProjectIndex;
      const currentCarousel = projects[currentProjectIndex].querySelector(".project-carousel");
      if (currentCarousel) {
        currentCarousel.scrollTo({
          left: 0,
          behavior: "smooth",
        });
      }
    }

    // Project titles are now static in HTML

    // Enable/disable click zones based on current section
    const aboutSection = document.querySelector(".about-section");
    const aboutRect = aboutSection.getBoundingClientRect();
    const isAboutVisible = aboutRect.top <= windowHeight / 2 && aboutRect.bottom >= windowHeight / 2;

    if (isAboutVisible) {
      // Disable click zones when on about section
      clickZoneLeft.classList.remove("active");
      clickZoneRight.classList.remove("active");
    } else {
      // Enable click zones when on project sections
      clickZoneLeft.classList.add("active");
      clickZoneRight.classList.add("active");
    }
  }

  // Project titles are now static in HTML - no dynamic updates needed

  // Listen for scroll events to update current project
  window.addEventListener("scroll", updateCurrentProject);

  // Initial call
  updateCurrentProject();

  // Handle permalink navigation
  function handlePermalink() {
    const hash = window.location.hash.substring(1);
    if (hash) {
      const targetProject = document.getElementById(hash);
      if (targetProject) {
        const projectIndex = Array.from(projects).indexOf(targetProject);
        if (projectIndex !== -1) {
          currentProjectIndex = projectIndex;
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
  }

  // Listen for hash changes
  window.addEventListener("hashchange", handlePermalink);

  // Handle initial permalink on page load
  handlePermalink();

  if (!isMobile) {
    clickZoneLeft.addEventListener("click", (e) => {
      // Only trigger if not clicking on a link or interactive element
      if (e.target.tagName === "A" || e.target.closest("a")) {
        return;
      }
      e.preventDefault();
      const currentProject = projects[currentProjectIndex];
      const currentCarousel = currentProject ? currentProject.querySelector(".project-carousel") : null;
      if (currentCarousel) {
        previousSlide(currentCarousel);
      }
    });

    clickZoneRight.addEventListener("click", (e) => {
      // Only trigger if not clicking on a link or interactive element
      if (e.target.tagName === "A" || e.target.closest("a")) {
        return;
      }
      e.preventDefault();
      const currentProject = projects[currentProjectIndex];
      const currentCarousel = currentProject ? currentProject.querySelector(".project-carousel") : null;
      if (currentCarousel) {
        advanceSlide(currentCarousel);
      }
    });
  }

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

  // Add scroll indicators (optional)
  function updateScrollIndicators() {
    carousels.forEach((carousel) => {
      const slides = carousel.querySelectorAll(".slide");
      const scrollLeft = carousel.scrollLeft;
      const slideWidth = carousel.offsetWidth;
      const currentSlide = Math.round(scrollLeft / slideWidth);

      // You can add visual indicators here if needed
      console.log(`Current slide: ${currentSlide + 1} of ${slides.length}`);
    });
  }

  // Update indicators on scroll
  carousels.forEach((carousel) => {
    carousel.addEventListener("scroll", updateScrollIndicators);
  });
});

// Function to shuffle projects on page load
function shuffleProjects() {
  // Get all project sections (excluding about section and footer)
  const projectsContainer = document.querySelector("body");
  const aboutSection = document.querySelector(".about-section");
  const footer = document.querySelector(".footer");

  // Get all project sections
  const projects = Array.from(document.querySelectorAll(".project"));

  if (projects.length <= 1) return; // No need to shuffle if there's only one project

  // Create a copy of projects array and shuffle it
  const shuffledProjects = [...projects];
  for (let i = shuffledProjects.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledProjects[i], shuffledProjects[j]] = [shuffledProjects[j], shuffledProjects[i]];
  }

  // Remove all projects from DOM
  projects.forEach((project) => project.remove());

  // Insert shuffled projects after about section
  shuffledProjects.forEach((project) => {
    aboutSection.insertAdjacentElement("afterend", project);
  });
}
