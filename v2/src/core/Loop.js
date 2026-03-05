export class Loop {
  constructor() {
    this.callbacks = [];
    this.lastTime = 0;
    this.running = false;
    this.tick = this.tick.bind(this);
  }

  onUpdate(cb) {
    this.callbacks.push(cb);
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.tick();
  }

  stop() {
    this.running = false;
  }

  tick() {
    if (!this.running) return;
    requestAnimationFrame(this.tick);

    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    for (const cb of this.callbacks) {
      cb(delta, now / 1000);
    }
  }
}
