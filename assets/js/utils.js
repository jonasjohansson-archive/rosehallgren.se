/* ========================================
   UTILITIES
   ======================================== */

// Check if device is mobile
export function isMobile() {
  return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Shuffle projects on page load
export function shuffleProjects() {
  // Get all project sections (excluding about section and footer)
  const aboutSection = document.querySelector(".about-section");
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

// Initialize page position
export function initializePagePosition() {
  // Always start at the top of the page on reload (instant, no transition)
  window.addEventListener("beforeunload", function () {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  });

  // Ensure we start at the top of the page (instant, no transition)
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}
