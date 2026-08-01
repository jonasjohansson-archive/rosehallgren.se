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

class Portfolio {
  constructor() {
    this.currentProjectIndex = 0;
    this.projects = Array.from(document.querySelectorAll(".project"));
    this.navUpdaters = new Map();

    this.initCarousels();
    this.setupBackdrops();
    this.setupColorExtraction();
    this.setupEventListeners();
    this.setupPermalinkHandling();
    this.updateCurrentProject();
  }

  // --- carousels -----------------------------------------------------------

  initCarousels() {
    document.querySelectorAll(".project-carousel").forEach((carousel) => {
      const nav = this.createNavigation(carousel);
      this.setupNavigationUpdates(carousel, nav);

      // Text slides scroll internally below 768px. Chrome only makes a
      // scroller keyboard-focusable when it has no focusable children, and
      // most of these contain links, so they need it explicitly or their tail
      // is unreachable at large text sizes.
      carousel
        .querySelectorAll(".slide:has(.slide-content)")
        .forEach((slide) => {
          slide.setAttribute("tabindex", "0");
          slide.setAttribute("role", "group");
          slide.setAttribute(
            "aria-label",
            `${this.titleOf(carousel)} description`,
          );
        });

      carousel.setAttribute("tabindex", "0");
      carousel.setAttribute("role", "group");
      carousel.setAttribute("aria-label", `${this.titleOf(carousel)} images`);
      this.setupPointerNavigation(carousel);
      // Bound to the carousel, not the document, so the arrow keys act on the
      // carousel that actually has focus and page scrolling is left alone.
      carousel.addEventListener("keydown", (e) =>
        this.handleCarouselKeys(e, carousel),
      );
    });
  }

  /**
   * Click and tap navigation.
   *
   * Touch: tapping an image advances, since aiming for a 20% strip with a
   * thumb is fiddly.
   * Mouse: the outer fifth on each side steps back or forward, the middle
   * three fifths do nothing, so text stays selectable and the image stays
   * clickable-through to nothing by accident.
   *
   * Guarded either way: never on a link, a dot or the copy, never when the
   * pointer moved more than 10px, never on a press longer than 500ms. Both
   * wrap within the project rather than jumping to the next one, which would
   * be a lot of travel for one click.
   */
  setupPointerNavigation(carousel) {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const EDGE = 0.2;
    let x = 0;
    let y = 0;
    let t = 0;

    carousel.addEventListener(
      "pointerdown",
      (e) => {
        x = e.clientX;
        y = e.clientY;
        t = e.timeStamp;
      },
      { passive: true },
    );

    carousel.addEventListener("pointerup", (e) => {
      // Right, middle and the mouse back button were all advancing the slide,
      // so "Save image as…" opened the menu and jumped the carousel at once.
      if (e.button !== 0 || !e.isPrimary) return;
      // Links and buttons still win, but the text panel itself is now a target:
      // it was the one slide you could not click your way out of.
      if (e.target.closest("a, button")) return;
      if (Math.hypot(e.clientX - x, e.clientY - y) > 10) return;
      if (e.timeStamp - t > 500) return;

      const rect = carousel.getBoundingClientRect();
      const frac = (e.clientX - rect.left) / rect.width;
      const current = this.currentSlide(carousel);
      const max = this.maxIndex(carousel);

      // A text panel advances from anywhere on it, not just from the outer
      // fifth. The edge zones exist so a click on a photograph does not have to
      // cover the photograph; copy has no such claim on the middle of the
      // slide, and clicking the paragraph you have just finished reading is the
      // obvious way to move on.
      const onCopy = !!e.target.closest(".slide-content");

      // No wrap. Reaching the last slide and being thrown back to the first
      // reads as a glitch rather than as navigation, so both ends are walls.
      if (coarse || (onCopy && frac >= EDGE)) {
        if (current < max) this.goToSlide(carousel, current + 1);
      } else if (frac < EDGE) {
        if (current > 0) this.goToSlide(carousel, current - 1);
      } else if (frac > 1 - EDGE) {
        if (current < max) this.goToSlide(carousel, current + 1);
      }
    });

    // Show which way a click will go, without a pointermove listener doing
    // work on every frame: the class only changes when the zone changes.
    if (!coarse) {
      let zone = "";
      carousel.addEventListener(
        "pointermove",
        (e) => {
          const rect = carousel.getBoundingClientRect();
          const frac = (e.clientX - rect.left) / rect.width;
          // Over copy the whole slide advances, so the cursor has to say so
          // right across it rather than only in the outer fifth.
          const onCopy = !!e.target.closest(".slide-content");
          const next =
            frac < EDGE ? "prev" : frac > 1 - EDGE || onCopy ? "next" : "";
          if (next === zone) return;
          zone = next;
          carousel.classList.toggle("zone-prev", next === "prev");
          carousel.classList.toggle("zone-next", next === "next");
        },
        { passive: true },
      );
      carousel.addEventListener("pointerleave", () => {
        zone = "";
        carousel.classList.remove("zone-prev", "zone-next");
      });
    }
  }

  titleOf(carousel) {
    return (
      carousel.parentElement
        .querySelector(".project-title")
        ?.textContent.trim() || "Project"
    );
  }

  createNavigation(carousel) {
    const nav = document.createElement("div");
    nav.className = "carousel-navigation";

    const dots = document.createElement("div");
    dots.className = "carousel-dots";
    nav.appendChild(dots);

    const title = this.titleOf(carousel);
    // Above 1200px two slides share the viewport, so the last slide can never
    // scroll to the left edge. One dot per slide left a permanently dead
    // control in the tab order on every project.
    const count = this.maxIndex(carousel) + 1;

    // Nothing to navigate to. Above 1600px two slides share the viewport, so a
    // project with exactly two slides shows both at once and the dot row would
    // be a single dot pointing at what you are already looking at.
    if (count < 2) {
      carousel.parentElement.appendChild(nav);
      nav.hidden = true;
      return nav;
    }

    Array.from({ length: count }).forEach((_, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "carousel-dot";
      dot.dataset.slide = index;
      dot.setAttribute(
        "aria-label",
        `${title}, slide ${index + 1} of ${count}`,
      );
      dots.appendChild(dot);
    });

    dots.addEventListener("click", (e) => {
      const dot = e.target.closest(".carousel-dot");
      if (dot) this.goToSlide(carousel, Number(dot.dataset.slide));
    });

    carousel.parentElement.appendChild(nav);
    return nav;
  }

  /**
   * Widest scroll offset the carousel can actually reach. Above 1600px two
   * slides share the viewport, so the final slide can never scroll to the
   * left edge — indexing straight off slide count left the last dot dead and
   * made two-slide projects a trap for the arrow keys.
   */
  maxIndex(carousel) {
    const width = this.slideWidth(carousel);
    return Math.max(
      0,
      Math.round((carousel.scrollWidth - carousel.clientWidth) / width),
    );
  }

  slideWidth(carousel) {
    return carousel.clientWidth >= 1600
      ? carousel.clientWidth / 2
      : carousel.clientWidth;
  }

  currentSlide(carousel) {
    return Math.round(carousel.scrollLeft / this.slideWidth(carousel));
  }

  setupNavigationUpdates(carousel, nav) {
    const dots = nav.querySelectorAll(".carousel-dot");
    const project = carousel.closest(".project");
    const slides = Array.from(carousel.querySelectorAll(".slide"));
    const update = () => {
      const current = this.currentSlide(carousel);

      // .project-title is absolutely positioned over the project, so it also
      // sits over the text slides as they scroll past. Colouring it once from
      // the lead photo left it at 1.16:1 on some projects. Follow the slide
      // actually underneath instead: the text slides are a dark shade of the
      // photo, so white clears there.
      // Surfaces are flat and known: paper under an image slide, the dark
      // panel under a text slide. No sampling needed, and no way for the
      // title to land on a backdrop it was not measured against.
      // Names a surface, never a colour. Which ink belongs on paper and which
      // on the dark panel is a design decision, so it lives in the stylesheet
      // next to --paper and --ink rather than as a hex literal in here.
      const surface = (slide) =>
        slide && slide.querySelector(".slide-content") ? "panel" : "paper";

      const under = slides[Math.min(current, slides.length - 1)];
      if (under && project) {
        project.dataset.titleOn = surface(under);

        // The title sits top-left and the dots top-right. Above 1600px the
        // carousel shows two slides at once, so the dots are over the NEXT
        // slide and can need the opposite colour from the title.
        const twoUp = carousel.clientWidth / this.slideWidth(carousel) > 1.5;
        project.dataset.dotsOn = surface(
          twoUp ? slides[Math.min(current + 1, slides.length - 1)] : under,
        );
      }

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
    carousel.scrollTo({
      left: target * this.slideWidth(carousel),
      behavior: motion(),
    });
  }

  advanceSlide(carousel) {
    const current = this.currentSlide(carousel);
    if (current < this.maxIndex(carousel))
      this.goToSlide(carousel, current + 1);
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
      if (rect.top <= middle && rect.bottom >= middle)
        this.currentProjectIndex = index;
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
      { passive: true },
    );

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        // Crossing 1200px changes how many slides share the viewport, and so
        // how many dots are reachable.
        document.querySelectorAll(".project-carousel").forEach((carousel) => {
          const nav = carousel.parentElement.querySelector(
            ".carousel-navigation",
          );
          const want = this.maxIndex(carousel) + 1;
          if (nav && nav.querySelectorAll(".carousel-dot").length !== want) {
            nav.remove();
            this.setupNavigationUpdates(
              carousel,
              this.createNavigation(carousel),
            );
            return;
          }
        });
        this.navUpdaters.forEach((update) => update());
      }, 150);
    });
  }

  // --- colour --------------------------------------------------------------

  /**
   * The slide's blurred backdrop, taken from the image already on screen.
   *
   * currentSrc, so it reuses the exact file the browser picked off the srcset
   * and costs no second request. Set after load because before that currentSrc
   * is empty and the background shorthand would be invalid.
   */
  setBackdrop(img) {
    const slide = img.closest(".image-slide");
    if (!slide) return;
    const apply = () => {
      const src = img.currentSrc || img.src;
      if (!src) return;
      slide.style.setProperty("--bg-image", `url("${src}")`);
      // Lets CSS fade it in rather than snap it on.
      slide.dataset.backdrop = "";
    };
    if (img.complete && img.naturalWidth) apply();
    else img.addEventListener("load", apply, { once: true });
  }

  /**
   * Arm every image slide's backdrop up front.
   *
   * This used to hang off the same IntersectionObserver as the colour
   * extraction, which meant the wash appeared only once the slide was already
   * on screen — you saw flat paper, then it popped. Hanging it off the image's
   * own load event instead means the backdrop and the photograph arrive
   * together, since content-visibility does not start the download until the
   * slide is near the viewport anyway.
   */
  setupBackdrops() {
    document
      .querySelectorAll(".image-slide img.screen-only")
      .forEach((img) => this.setBackdrop(img));
  }

  setupColorExtraction() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) this.extractColorFromImage(entry.target);
        });
      },
      { threshold: 0.1 },
    );
    document
      .querySelectorAll(".image-slide img")
      .forEach((img) => observer.observe(img));
  }

  extractColorFromImage(img) {
    // The observer fires before the first images have decoded; without this
    // retry the opening project never got its colour at all.
    if (!img.complete || !img.naturalWidth) {
      img.addEventListener("load", () => this.extractColorFromImage(img), {
        once: true,
      });
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
      ctx.drawImage(
        img,
        0,
        0,
        img.naturalWidth,
        img.naturalHeight * 0.15,
        0,
        0,
        1,
        1,
      );
      [topR, topG, topB] = ctx.getImageData(0, 0, 1, 1).data;
    } catch {
      // Tainted canvas (file:// or a cross-origin move). Keep the defaults.
      return;
    }

    const project = img.closest(".project");
    if (project && img === project.querySelector(".image-slide img")) {
      // The title and dot colours are NOT set here any more. This sampled the
      // top 15% of the lead photo back when the slide background was that photo
      // blurred; the backdrop is now flat paper, so the surface under the title
      // is known and setupNavigationUpdates picks ink or white outright. Left
      // in place, this would put a photo-derived tint on #eeece8 — which is the
      // 1.16:1 failure it was originally written to prevent.

      // Opaque, not rgba(…, 0.8): at 0.8 the white page showed through and
      // cancelled most of the darkening, leaving white text at 4.2:1 on
      // C.O.U.A. and 4.52:1 on Folkbastu.
      const shade = (c) => Math.max(0, c - 50);
      project.style.setProperty(
        "--project-text-bg",
        `rgb(${shade(r)}, ${shade(g)}, ${shade(b)})`,
      );
    }
  }
}

document.addEventListener("DOMContentLoaded", () => new Portfolio());
