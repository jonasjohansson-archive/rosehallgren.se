export class ScrollController {
  constructor(scrollWrapper) {
    this.progress = 0;
    this.prevProgress = 0;
    this.scrollWrapper = scrollWrapper;
    this.onScroll = this.onScroll.bind(this);
    this.scrollWrapper.addEventListener('scroll', this.onScroll, { passive: true });
  }

  onScroll() {
    const el = this.scrollWrapper;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll > 0) {
      this.prevProgress = this.progress;
      this.progress = el.scrollTop / maxScroll;
    }
  }

  getProgress() {
    return this.progress;
  }

  getDelta() {
    const d = this.progress - this.prevProgress;
    this.prevProgress = this.progress;
    return d;
  }

  disable() {
    this.scrollWrapper.style.pointerEvents = 'none';
  }

  enable() {
    this.scrollWrapper.style.pointerEvents = '';
  }
}
