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
    this.setupPrintImages();
    this.setupCarouselReset();
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
   * Mouse: the outer two fifths on each side step back or forward, the middle
   * fifth does nothing, so text stays selectable and the image stays
   * clickable-through to nothing by accident.
   *
   * Guarded either way: never on a link, a dot or the copy, never when the
   * pointer moved more than 10px, never on a press longer than 500ms. Both
   * wrap within the project rather than jumping to the next one, which would
   * be a lot of travel for one click.
   */
  setupPointerNavigation(carousel) {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    // 40% a side. At 20% the target was a narrow strip most people never found;
    // this leaves the middle fifth neutral, which is enough to select text and
    // to click a link without triggering navigation.
    const EDGE = 0.4;
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
      // Where the pointer last was, kept so the cursor can be re-decided when
      // the slide changes underneath a pointer that has not moved.
      let frac = -1;
      let onCopy = false;

      // The wall check lives here rather than in the pointermove handler
      // because the answer changes on scroll too: reaching the last slide with
      // the pointer sitting still in the right-hand zone left an e-resize
      // cursor promising a slide that no longer exists.
      const applyZone = () => {
        const current = this.currentSlide(carousel);
        const max = this.maxIndex(carousel);
        let next =
          frac < 0 ? "" : frac < EDGE ? "prev" : frac > 1 - EDGE || onCopy ? "next" : "";
        if (next === "prev" && current <= 0) next = "";
        if (next === "next" && current >= max) next = "";
        if (next === zone) return;
        zone = next;
        carousel.classList.toggle("zone-prev", next === "prev");
        carousel.classList.toggle("zone-next", next === "next");
      };
      carousel.addEventListener(
        "pointermove",
        (e) => {
          const rect = carousel.getBoundingClientRect();
          frac = (e.clientX - rect.left) / rect.width;
          // Over copy the whole slide advances, so the cursor has to say so
          // right across it rather than only in the outer fifth.
          onCopy = !!e.target.closest(".slide-content");
          applyZone();
        },
        { passive: true },
      );
      carousel.addEventListener("scroll", applyZone, { passive: true });
      carousel.addEventListener("pointerleave", () => {
        frac = -1;
        onCopy = false;
        applyZone();
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

      // Which slide is actually beneath a given point, by geometry rather than
      // by index. Indexing was wrong on the copy-first projects: those reorder
      // with CSS `order: -1`, which moves a slide visually and leaves the DOM
      // alone, so slides[0] was the photograph while the panel was the one on
      // screen. Jag är Gud therefore ran ink-on-panel at about 1.4:1, and the
      // title was close to invisible.
      const slideAt = (clientX) =>
        slides.find((slide) => {
          const r = slide.getBoundingClientRect();
          return clientX >= r.left && clientX < r.right;
        });

      const title = project && project.querySelector(".project-title");
      if (project && title) {
        const box = carousel.getBoundingClientRect();
        const titleBox = title.getBoundingClientRect();
        // Fall back to the indexed slide if the title has no box yet, which is
        // the case while a project is still skipped by content-visibility.
        const under =
          slideAt(titleBox.left + titleBox.width / 2) ||
          slides[Math.min(current, slides.length - 1)];
        project.dataset.titleOn = surface(under);

        // The dots sit apart from the title, so they get their own reading.
        // Above 1600px the carousel shows two slides at once and they can land
        // on the opposite surface.
        const dotRow = nav.getBoundingClientRect();
        const underDots =
          slideAt(dotRow.left + dotRow.width / 2) ||
          slideAt(box.left + box.width / 2) ||
          under;
        project.dataset.dotsOn = surface(underDots);
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

  /**
   * Get the print JPEGs onto the wire before someone prints.
   *
   * They are display: none with loading="lazy", which is what keeps 26MB off
   * the page — no layout box, so they never intersect and never load. The cost
   * is that Cmd+P is the first moment they are asked for, and Chrome will
   * happily rasterise the preview before 125 of them have arrived, which is why
   * images come out blank.
   *
   * Setting loading="eager" on an already-parsed lazy image starts the fetch
   * immediately, so Cmd/Ctrl+P warms them while the dialog is opening,
   * beforeprint warms them for a menu-triggered print, and after two idle
   * minutes they trickle in anyway. Skipped when the browser reports Save Data.
   */
  setupPrintImages() {
    const imgs = () => Array.from(document.querySelectorAll("img.print-only"));
    let warmed = false;
    const warmAll = () => {
      if (warmed) return;
      warmed = true;
      imgs().forEach((img) => {
        img.loading = "eager";
      });
    };

    addEventListener(
      "keydown",
      (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p") warmAll();
      },
      { capture: true },
    );
    addEventListener("beforeprint", warmAll);

    if (navigator.connection?.saveData) return;

    setTimeout(() => {
      const queue = imgs();
      const pump = () => {
        if (warmed || !queue.length) return;
        queue.splice(0, 4).forEach((img) => {
          img.loading = "eager";
        });
        (window.requestIdleCallback || setTimeout)(pump, { timeout: 2000 });
      };
      pump();
    }, 120000);
  }

  /**
   * Wind a project's carousel back once it is fully off screen.
   *
   * Scroll positions otherwise persist for the life of the page: a project you
   * paged four slides into is still on slide four when you come back to it,
   * opening on a detail with no idea what the project is. Reset on exit rather
   * than on entry so it is never seen happening, and instantly for the same
   * reason.
   */
  setupCarouselReset() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) return;
          const carousel = entry.target.querySelector(".project-carousel");
          if (!carousel || carousel.scrollLeft === 0) return;
          carousel.scrollTo({ left: 0, behavior: "instant" });
          const update = this.navUpdaters.get(carousel);
          if (update) update();
        });
      },
      { threshold: 0 },
    );
    this.projects.forEach((project) => observer.observe(project));
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
        // Crossing 1600px changes how many slides share the viewport, and so
        // how many dots are reachable.
        document.querySelectorAll(".project-carousel").forEach((carousel) => {
          const nav = carousel.parentElement.querySelector(
            ".carousel-navigation",
          );
          // How many dot elements SHOULD exist, which is not the same as how
          // many stops there are: createNavigation builds none at all for a
          // single-stop carousel and hides the row instead. Comparing against
          // the stop count meant a two-slide project at the two-up breakpoint
          // reported 0 !== 1 on every resize, rebuilt its navigation, and
          // registered another scroll listener each time — with no matching
          // removeEventListener anywhere. A window drag added one per settle,
          // without bound, which is the leak the comment on the listener says
          // was already fixed once.
          const stops = this.maxIndex(carousel) + 1;
          const want = stops < 2 ? 0 : stops;
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
}

document.addEventListener("DOMContentLoaded", () => new Portfolio());
