export function isMobile() {
  return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function initializePagePosition() {
  window.addEventListener("beforeunload", function () {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  });

  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}
