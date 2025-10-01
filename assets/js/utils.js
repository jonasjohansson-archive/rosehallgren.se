export function isMobile() {
  return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function shuffleProjects() {
  const aboutSection = document.querySelector(".about-section");
  const projects = Array.from(document.querySelectorAll(".project"));

  if (projects.length <= 1) return;

  const shuffledProjects = [...projects];
  for (let i = shuffledProjects.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledProjects[i], shuffledProjects[j]] = [shuffledProjects[j], shuffledProjects[i]];
  }

  projects.forEach((project) => project.remove());

  shuffledProjects.forEach((project) => {
    aboutSection.insertAdjacentElement("afterend", project);
  });
}

export function initializePagePosition() {
  window.addEventListener("beforeunload", function () {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  });

  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}
