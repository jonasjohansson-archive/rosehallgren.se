/**
 * Studio Rose Hallgren — portfolio behaviour.
 *
 * Projects appear in document order. The order is editorial, so it lives in
 * index.html: to resequence the site, move the <section class="project">
 * blocks. (This previously shuffled at runtime, which meant deep links landed
 * at a different scroll depth every visit and the site's own preload hints
 * pointed at whichever project had been randomised away from the top.)
 */

const REDUCE_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");

/** Scroll behaviour honouring the user's motion preference. */
const motion = () => (REDUCE_MOTION.matches ? "auto" : "smooth");

/** WCAG relative luminance for an sRGB triple. */
function luminance(r, g, b) {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/**
 * Pull a colour down until it clears 4.5:1 against white.
 *
 * The extracted colour is used as body-text colour on a white page, and
 * measured across the shipped images 20 of 62 landed below AA — a light
 * photograph would tint the bio to 2.6:1. Hue is preserved; only over-light
 * values move.
 */
function clampOnWhite(r, g, b) {
  // Contrast against white is 1.05 / (L + 0.05); 4.5:1 needs L <= 0.1833.
  let scale = 1;
  while (scale > 0.05 && luminance(r * scale, g * scale, b * scale) > 0.1833) {
    scale -= 0.02;
  }
  return [Math.round(r * scale), Math.round(g * scale), Math.round(b * scale)];
}

/**
 * A tint of the backdrop's own colour that still clears 4.5:1 against it.
 *
 * Keeps the project's hue in the title instead of flat white, so no drop
 * shadow is needed. Lightens by preference; over a bright photo a light tint
 * can never reach 4.5:1, so it darkens the same hue instead.
 */
function legibleTint(r, g, b) {
  const bgL = luminance(r, g, b);
  const contrast = (a) => {
    const L = luminance(a[0], a[1], a[2]);
    return (Math.max(L, bgL) + 0.05) / (Math.min(L, bgL) + 0.05);
  };
  const toward = (target, t) => [r, g, b].map((c) => c + (target - c) * t);

  for (const target of [255, 0]) {
    for (let t = 0.45; t <= 1.0001; t += 0.05) {
      const c = toward(target, t);
      if (contrast(c) >= 4.5) return `rgb(${c.map(Math.round).join(", ")})`;
    }
  }
  return bgL > 0.18 ? "#000" : "#fff";
}

class Portfolio {
  constructor() {
    this.currentProjectIndex = 0;
    this.projects = Array.from(document.querySelectorAll(".project"));
    this.navUpdaters = new Map();

    this.initCarousels();
    this.setupColorExtraction();
    this.setupEventListeners();
    this.setupPermalinkHandling();
    this.updateCurrentProject();
  }

  // --- carousels -----------------------------------------------------------

  initCarousels() {
    document.querySelectorAll(".project-carousel").forEach((carousel) => {
      const nav = this.createNavigation(carousel);
      this.setupImageSlides(carousel);
      this.setupNavigationUpdates(carousel, nav);

      carousel.setAttribute("tabindex", "0");
      carousel.setAttribute("role", "group");
      carousel.setAttribute("aria-label", `${this.titleOf(carousel)} — images`);
      // Bound to the carousel, not the document, so the arrow keys act on the
      // carousel that actually has focus and page scrolling is left alone.
      carousel.addEventListener("keydown", (e) => this.handleCarouselKeys(e, carousel));
    });
  }

  titleOf(carousel) {
    return carousel.parentElement.querySelector(".project-title")?.textContent.trim() || "Project";
  }

  createNavigation(carousel) {
    const nav = document.createElement("div");
    nav.className = "carousel-navigation";

    const dots = document.createElement("div");
    dots.className = "carousel-dots";
    nav.appendChild(dots);

    const title = this.titleOf(carousel);
    const slides = carousel.querySelectorAll(".slide");
    slides.forEach((_, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "carousel-dot";
      dot.dataset.slide = index;
      dot.setAttribute("aria-label", `${title}, slide ${index + 1} of ${slides.length}`);
      dots.appendChild(dot);
    });

    dots.addEventListener("click", (e) => {
      const dot = e.target.closest(".carousel-dot");
      if (dot) this.goToSlide(carousel, Number(dot.dataset.slide));
    });

    carousel.parentElement.appendChild(nav);
    return nav;
  }

  setupImageSlides(carousel) {
    carousel.querySelectorAll(".image-slide").forEach((slide) => {
      const img = slide.querySelector("img");
      if (!img) return;
      const apply = () => slide.style.setProperty("--bg-image", `url(${img.currentSrc || img.src})`);
      if (img.complete) apply();
      else img.addEventListener("load", apply, { once: true });
    });
  }

  /**
   * Widest scroll offset the carousel can actually reach. Above 1200px two
   * slides share the viewport, so the final slide can never scroll to the
   * left edge — indexing straight off slide count left the last dot dead and
   * made two-slide projects a trap for the arrow keys.
   */
  maxIndex(carousel) {
    const width = this.slideWidth(carousel);
    return Math.max(0, Math.round((carousel.scrollWidth - carousel.clientWidth) / width));
  }

  slideWidth(carousel) {
    return carousel.clientWidth >= 1200 ? carousel.clientWidth / 2 : carousel.clientWidth;
  }

  currentSlide(carousel) {
    return Math.round(carousel.scrollLeft / this.slideWidth(carousel));
  }

  setupNavigationUpdates(carousel, nav) {
    const dots = nav.querySelectorAll(".carousel-dot");
    const update = () => {
      const current = this.currentSlide(carousel);
      dots.forEach((dot, index) => {
        dot.classList.toggle("active", index === current);
        if (index === current) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
    };
    // Registered once. Re-registering per resize previously accumulated
    // listeners without bound — a window drag added hundreds.
    carousel.addEventListener("scroll", update, { passive: true });
    this.navUpdaters.set(carousel, update);
    update();
  }

  goToSlide(carousel, index) {
    const target = Math.min(Math.max(index, 0), this.maxIndex(carousel));
    carousel.scrollTo({ left: target * this.slideWidth(carousel), behavior: motion() });
  }

  advanceSlide(carousel) {
    const current = this.currentSlide(carousel);
    if (current < this.maxIndex(carousel)) this.goToSlide(carousel, current + 1);
    else this.stepProject(1);
  }

  previousSlide(carousel) {
    const current = this.currentSlide(carousel);
    if (current > 0) this.goToSlide(carousel, current - 1);
    else this.stepProject(-1);
  }

  // --- navigation ----------------------------------------------------------

  handleCarouselKeys(e, carousel) {
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    if (e.target.closest("input, textarea, select, [contenteditable]")) return;

    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        this.previousSlide(carousel);
        break;
      case "ArrowRight":
        e.preventDefault();
        this.advanceSlide(carousel);
        break;
      default:
        return;
    }
  }

  /** Move by one project. Also reachable from the ends of a carousel. */
  stepProject(delta) {
    const next = this.currentProjectIndex + delta;
    if (next < 0 || next >= this.projects.length) return;
    this.currentProjectIndex = next;
    this.projects[next].scrollIntoView({ behavior: motion(), block: "start" });
  }

  updateCurrentProject() {
    const middle = window.innerHeight / 2;
    this.projects.forEach((project, index) => {
      const rect = project.getBoundingClientRect();
      if (rect.top <= middle && rect.bottom >= middle) this.currentProjectIndex = index;
    });
  }

  setupPermalinkHandling() {
    const go = () => {
      const target = document.getElementById(location.hash.slice(1));
      if (!target) return;
      const index = this.projects.indexOf(target);
      if (index !== -1) this.currentProjectIndex = index;
      target.scrollIntoView({ behavior: motion(), block: "start" });
    };
    window.addEventListener("hashchange", go);
    if (location.hash) go();
  }

  setupEventListeners() {
    let scrollRAF = null;
    window.addEventListener(
      "scroll",
      () => {
        if (scrollRAF) return;
        scrollRAF = requestAnimationFrame(() => {
          this.updateCurrentProject();
          scrollRAF = null;
        });
      },
      { passive: true }
    );

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.navUpdaters.forEach((update) => update());
      }, 150);
    });
  }

  // --- colour --------------------------------------------------------------

  setupColorExtraction() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) this.extractColorFromImage(entry.target);
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".image-slide img").forEach((img) => observer.observe(img));
  }

  extractColorFromImage(img) {
    // The observer fires before the first images have decoded; without this
    // retry the opening project never got its colour at all.
    if (!img.complete || !img.naturalWidth) {
      img.addEventListener("load", () => this.extractColorFromImage(img), { once: true });
      return;
    }

    let r, g, b, topR, topG, topB;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      ctx.drawImage(img, 0, 0, 1, 1);
      [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;

      // Sample only the top 15%, where the project title sits. Averaging the
      // whole frame put white titles at ~2:1 over bright skies.
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight * 0.15, 0, 0, 1, 1);
      [topR, topG, topB] = ctx.getImageData(0, 0, 1, 1).data;
    } catch {
      // Tainted canvas (file:// or a cross-origin move). Keep the defaults.
      return;
    }

    const project = img.closest(".project");
    if (project && img === project.querySelector(".image-slide img")) {
      // Set from the lead image, which is what the title sits over on arrival.
      // Later slides keep this colour and lean on the text-shadow.
      project.style.setProperty("--project-title-color", legibleTint(topR, topG, topB));

      // Opaque, not rgba(…, 0.8): at 0.8 the white page showed through and
      // cancelled most of the darkening, leaving white text at 4.2:1 on
      // C.O.U.A. and 4.52:1 on Folkbastu.
      const shade = (c) => Math.max(0, c - 50);
      project.style.setProperty("--project-text-bg", `rgb(${shade(r)}, ${shade(g)}, ${shade(b)})`);
    }

    const [cr, cg, cb] = clampOnWhite(r, g, b);
    document.documentElement.style.setProperty("--logo-color", `rgb(${cr}, ${cg}, ${cb})`);
  }
}

document.addEventListener("DOMContentLoaded", () => new Portfolio());
