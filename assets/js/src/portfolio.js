import { motion } from "./motion.js";
import { Carousel } from "./carousel.js";

/**
 * The page: which project you are in, deep links, print warming, and the two
 * window-level listeners. Anything belonging to a single carousel lives on the
 * Carousel that owns it.
 *
 * Projects appear in document order. The order is editorial, so it lives in the
 * markup: to resequence the site, change `order` in the CMS. (This previously
 * shuffled at runtime, which meant deep links landed at a different scroll
 * depth every visit and the site's own preload hints pointed at whichever
 * project had been randomised away from the top.)
 */
export class Portfolio {
  constructor() {
    this.currentProjectIndex = 0;
    this.projects = Array.from(document.querySelectorAll(".project"));
    this.carousels = Array.from(
      document.querySelectorAll(".project-carousel"),
    ).map((el) => new Carousel(el, this));

    this.setupPrintImages();
    this.setupImageWarming();
    this.setupCarouselReset();
    this.setupEventListeners();
    this.setupPermalinkHandling();
    this.updateCurrentProject();
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
   * happily rasterise the preview before all of them have arrived, which is why
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
   * Fetch a project's photographs before it reaches the screen.
   *
   * The page is deliberately lazy: content-visibility skips every offscreen
   * project and every offscreen slide, so their images never intersect and are
   * never requested. That is what took mobile LCP from 6.2s to 2.6s, and it is
   * also why a photograph can still be arriving once you are looking at it —
   * on a phone, where one slide fills the screen and the next is one swipe
   * away, that is the blank white flash.
   *
   * Same lever as the print warming: setting loading="eager" on an
   * already-parsed lazy image starts the fetch whether or not the browser is
   * rendering it. Here it is pulled two viewports ahead of the scroll, so these
   * are the same bytes the page would have fetched anyway — only early enough
   * to be decoded before they are looked at.
   *
   * Three at a time. A project of eight photographs released at once is the
   * problem the containment was added to solve: everything at Low priority
   * down one connection, each image getting a fraction of the pipe.
   */
  setupImageWarming() {
    // The two cases where fetching something that may never be looked at is
    // the wrong trade. Everyone else has already agreed to these bytes by
    // scrolling toward them.
    const link = navigator.connection;
    if (link?.saveData || /(^|-)2g$/.test(link?.effectiveType || "")) return;

    const queue = [];
    let active = 0;

    const pump = () => {
      while (active < 3 && queue.length) {
        const img = queue.shift();
        // Already eager (the LCP hero) or already here.
        if (img.loading !== "lazy" || img.complete) continue;
        active += 1;
        const done = () => {
          active -= 1;
          pump();
        };
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
        img.loading = "eager";
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          // Once warmed, a project has nothing left to say.
          observer.unobserve(entry.target);
          queue.push(
            ...entry.target.querySelectorAll(".image-slide img.screen-only"),
          );
        });
        pump();
      },
      // Two viewports down, one up: down is where you are going, up is what you
      // see if you turn around. Each project is 100vh, so this is roughly the
      // next two projects and the previous one — including their sideways
      // slides, which is where the flash was worst.
      { rootMargin: "100% 0px 200% 0px" },
    );

    // After load, never during it: warming must not compete with the LCP image,
    // the font, or the stylesheet for the connection.
    const start = () =>
      this.projects.forEach((project) => observer.observe(project));
    if (document.readyState === "complete") start();
    else addEventListener("load", start, { once: true });
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
    const byProject = new Map(
      this.carousels.map((carousel) => [carousel.project, carousel]),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) return;
          byProject.get(entry.target)?.reset();
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
        // how many stops are reachable. Each carousel compares against the
        // count it built for, which is why nothing here has to reason about the
        // DOM: asking the dot elements instead is what leaked a scroll listener
        // per resize on every two-slide project.
        this.carousels.forEach((carousel) => {
          carousel.syncNavigation();
          carousel.update();
        });
      }, 150);
    });
  }
}
