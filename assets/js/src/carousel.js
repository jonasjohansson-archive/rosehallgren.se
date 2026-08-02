import { motion } from "./motion.js";

/**
 * One project's horizontal carousel.
 *
 * It owns its element, its navigation row and its updater. That ownership is
 * the point of the class, not tidiness: the previous version kept updaters in a
 * Map on the page and reconciled a carousel's intent on resize by counting the
 * dot elements in the DOM. Those two numbers disagree for a single-stop
 * carousel — none are built, one stop exists — so a two-slide project rebuilt
 * its navigation on every resize and registered another scroll listener each
 * time, unbounded, with no removeEventListener anywhere in the file.
 *
 * Here the scroll listener is registered once, in the constructor, and
 * rebuilding the navigation cannot touch it. `stops` is remembered rather than
 * re-derived from the DOM, so the resize check compares like with like.
 */
export class Carousel {
  /**
   * @param {HTMLElement} el   the .project-carousel
   * @param {object} page      the Portfolio, for stepping past either end
   */
  constructor(el, page) {
    this.el = el;
    this.page = page;
    this.project = el.closest(".project");
    this.slides = Array.from(el.querySelectorAll(".slide"));
    this.nav = null;
    this.stops = 0;

    this.label();
    this.buildNavigation();
    this.setupPointerNavigation();

    // Registered once, for the life of the page. Everything that changes later
    // — the dot row, the stop count — is rebuilt around this, never over it.
    this.el.addEventListener("scroll", () => this.update(), { passive: true });

    // Bound to the carousel, not the document, so the arrow keys act on the
    // carousel that actually has focus and page scrolling is left alone.
    this.el.addEventListener("keydown", (e) => this.handleKeys(e));

    this.update();
  }

  get title() {
    return (
      this.el.parentElement.querySelector(".project-title")?.textContent.trim() ||
      "Project"
    );
  }

  /**
   * Widest scroll offset the carousel can actually reach. Above 1600px two
   * slides share the viewport, so the final slide can never scroll to the
   * left edge — indexing straight off slide count left the last dot dead and
   * made two-slide projects a trap for the arrow keys.
   */
  get maxIndex() {
    return Math.max(
      0,
      Math.round((this.el.scrollWidth - this.el.clientWidth) / this.slideWidth),
    );
  }

  get slideWidth() {
    return this.el.clientWidth >= 1600
      ? this.el.clientWidth / 2
      : this.el.clientWidth;
  }

  get currentSlide() {
    return Math.round(this.el.scrollLeft / this.slideWidth);
  }

  label() {
    // Text slides scroll internally below 768px. Chrome only makes a scroller
    // keyboard-focusable when it has no focusable children, and most of these
    // contain links, so they need it explicitly or their tail is unreachable at
    // large text sizes.
    this.el.querySelectorAll(".slide:has(.slide-content)").forEach((slide) => {
      slide.setAttribute("tabindex", "0");
      slide.setAttribute("role", "group");
      slide.setAttribute("aria-label", `${this.title} description`);
    });
    this.el.setAttribute("tabindex", "0");
    this.el.setAttribute("role", "group");
    this.el.setAttribute("aria-label", `${this.title} images`);
  }

  // --- navigation ----------------------------------------------------------

  buildNavigation() {
    if (this.nav) this.nav.remove();

    const nav = document.createElement("div");
    nav.className = "carousel-navigation";
    const dots = document.createElement("div");
    dots.className = "carousel-dots";
    nav.appendChild(dots);

    // Above 1600px two slides share the viewport, so the last slide can never
    // scroll to the left edge. One dot per slide left a permanently dead
    // control in the tab order on every project.
    const count = this.maxIndex + 1;
    this.stops = count;

    // Nothing to navigate to: a project with exactly two slides shows both at
    // once above 1600px, and the dot row would be a single dot pointing at what
    // you are already looking at.
    if (count < 2) {
      nav.hidden = true;
      this.el.parentElement.appendChild(nav);
      this.nav = nav;
      return;
    }

    Array.from({ length: count }).forEach((_, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "carousel-dot";
      dot.dataset.slide = index;
      dot.setAttribute("aria-label", `${this.title}, slide ${index + 1} of ${count}`);
      dots.appendChild(dot);
    });

    dots.addEventListener("click", (e) => {
      const dot = e.target.closest(".carousel-dot");
      if (dot) this.goTo(Number(dot.dataset.slide));
    });

    this.el.parentElement.appendChild(nav);
    this.nav = nav;
  }

  /** Rebuild only when the number of reachable stops has actually changed. */
  syncNavigation() {
    if (this.maxIndex + 1 === this.stops) return;
    this.buildNavigation();
    this.update();
  }

  update() {
    const current = this.currentSlide;

    // .project-title is absolutely positioned over the project, so it also sits
    // over the text slides as they scroll past. Colouring it once from the lead
    // photo left it at 1.16:1 on some projects. Follow the slide actually
    // underneath instead: the text slides are a dark shade of the photo, so
    // white clears there.
    // Names a surface, never a colour. Which ink belongs on paper and which on
    // the dark panel is a design decision, so it lives in the stylesheet next
    // to --paper and --ink rather than as a hex literal in here.
    //
    // A video slide counts as a panel too. It is --color-dark-bg edge to edge,
    // with no veil over it and no photograph to veil, so the ink title it was
    // getting ran at about 1.06:1 on the two projects that have one — the same
    // failure as a dark photograph, just guaranteed rather than occasional.
    const surface = (slide) =>
      slide && slide.querySelector(".slide-content, .video-slide")
        ? "panel"
        : "paper";

    // Which slide is beneath a given point, by geometry rather than by index.
    // Indexing was wrong on the copy-first projects: those reorder with CSS
    // `order: -1`, which moves a slide visually and leaves the DOM alone, so
    // slides[0] was the photograph while the panel was the one on screen. Jag
    // är Gud therefore ran ink-on-panel at about 1.4:1, close to invisible.
    const slideAt = (clientX) =>
      this.slides.find((slide) => {
        const r = slide.getBoundingClientRect();
        return clientX >= r.left && clientX < r.right;
      });

    const title = this.project && this.project.querySelector(".project-title");
    if (this.project && title) {
      const box = this.el.getBoundingClientRect();
      const titleBox = title.getBoundingClientRect();
      // Fall back to the indexed slide if the title has no box yet, which is
      // the case while a project is still skipped by content-visibility.
      const under =
        slideAt(titleBox.left + titleBox.width / 2) ||
        this.slides[Math.min(current, this.slides.length - 1)];
      this.project.dataset.titleOn = surface(under);

      // The dots sit apart from the title, so they get their own reading. Above
      // 1600px the carousel shows two slides at once and they can land on the
      // opposite surface.
      const dotRow = this.nav.getBoundingClientRect();
      const underDots =
        slideAt(dotRow.left + dotRow.width / 2) ||
        slideAt(box.left + box.width / 2) ||
        under;
      this.project.dataset.dotsOn = surface(underDots);
    }

    this.nav.querySelectorAll(".carousel-dot").forEach((dot, index) => {
      dot.classList.toggle("active", index === current);
      if (index === current) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
  }

  // --- moving --------------------------------------------------------------

  goTo(index) {
    const target = Math.min(Math.max(index, 0), this.maxIndex);
    this.el.scrollTo({ left: target * this.slideWidth, behavior: motion() });
  }

  next() {
    const current = this.currentSlide;
    if (current < this.maxIndex) this.goTo(current + 1);
    else this.page.stepProject(1);
  }

  previous() {
    const current = this.currentSlide;
    if (current > 0) this.goTo(current - 1);
    else this.page.stepProject(-1);
  }

  reset() {
    if (this.el.scrollLeft === 0) return;
    this.el.scrollTo({ left: 0, behavior: "instant" });
    this.update();
  }

  handleKeys(e) {
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    if (e.target.closest("input, textarea, select, [contenteditable]")) return;
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        this.previous();
        break;
      case "ArrowRight":
        e.preventDefault();
        this.next();
        break;
      default:
    }
  }

  /**
   * Click and tap navigation.
   *
   * Touch: tapping an image advances, since aiming for a narrow strip with a
   * thumb is fiddly.
   * Mouse: the outer two fifths on each side step back or forward, the middle
   * fifth does nothing, so text stays selectable and a link stays clickable.
   *
   * Guarded either way: never on a link, a dot or the copy, never when the
   * pointer moved more than 10px, never on a press longer than 500ms.
   */
  setupPointerNavigation() {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    // 40% a side. At 20% the target was a narrow strip most people never found;
    // this leaves the middle fifth neutral, which is enough to select text and
    // to click a link without triggering navigation.
    const EDGE = 0.4;
    let x = 0;
    let y = 0;
    let t = 0;

    this.el.addEventListener(
      "pointerdown",
      (e) => {
        x = e.clientX;
        y = e.clientY;
        t = e.timeStamp;
      },
      { passive: true },
    );

    this.el.addEventListener("pointerup", (e) => {
      // Right, middle and the mouse back button were all advancing the slide,
      // so "Save image as…" opened the menu and jumped the carousel at once.
      if (e.button !== 0 || !e.isPrimary) return;
      // Links and buttons still win, but the text panel itself is a target: it
      // was the one slide you could not click your way out of.
      if (e.target.closest("a, button")) return;
      if (Math.hypot(e.clientX - x, e.clientY - y) > 10) return;
      if (e.timeStamp - t > 500) return;

      const rect = this.el.getBoundingClientRect();
      const frac = (e.clientX - rect.left) / rect.width;
      const current = this.currentSlide;
      const max = this.maxIndex;

      // A text panel advances from anywhere on it, not just from the outer
      // fifth. The edge zones exist so a click on a photograph does not have to
      // cover the photograph; copy has no such claim on the middle of the
      // slide, and clicking the paragraph you have just finished reading is the
      // obvious way to move on.
      const onCopy = !!e.target.closest(".slide-content");

      // No wrap. Reaching the last slide and being thrown back to the first
      // reads as a glitch rather than as navigation, so both ends are walls.
      if (coarse || (onCopy && frac >= EDGE)) {
        if (current < max) this.goTo(current + 1);
      } else if (frac < EDGE) {
        if (current > 0) this.goTo(current - 1);
      } else if (frac > 1 - EDGE) {
        if (current < max) this.goTo(current + 1);
      }
    });

    // Show which way a click will go, without a pointermove listener doing work
    // on every frame: the class only changes when the zone changes.
    if (coarse) return;

    let zone = "";
    // Where the pointer last was, kept so the cursor can be re-decided when the
    // slide changes underneath a pointer that has not moved.
    let frac = -1;
    let onCopy = false;

    // The wall check lives here rather than in the pointermove handler because
    // the answer changes on scroll too: reaching the last slide with the
    // pointer sitting still in the right-hand zone left an e-resize cursor
    // promising a slide that no longer exists.
    const applyZone = () => {
      const current = this.currentSlide;
      const max = this.maxIndex;
      let next =
        frac < 0 ? "" : frac < EDGE ? "prev" : frac > 1 - EDGE || onCopy ? "next" : "";
      if (next === "prev" && current <= 0) next = "";
      if (next === "next" && current >= max) next = "";
      if (next === zone) return;
      zone = next;
      this.el.classList.toggle("zone-prev", next === "prev");
      this.el.classList.toggle("zone-next", next === "next");
    };

    this.el.addEventListener(
      "pointermove",
      (e) => {
        const rect = this.el.getBoundingClientRect();
        frac = (e.clientX - rect.left) / rect.width;
        // Over copy the whole slide advances, so the cursor has to say so right
        // across it rather than only in the outer fifth.
        onCopy = !!e.target.closest(".slide-content");
        applyZone();
      },
      { passive: true },
    );
    this.el.addEventListener("scroll", applyZone, { passive: true });
    this.el.addEventListener("pointerleave", () => {
      frac = -1;
      onCopy = false;
      applyZone();
    });
  }
}
