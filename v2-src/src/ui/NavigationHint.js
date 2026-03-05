export class NavigationHint {
  constructor() {
    this.el = document.getElementById('nav-hint');
    this.hidden = false;
  }

  hide() {
    if (this.hidden) return;
    this.hidden = true;
    this.el.classList.add('hidden');
  }

  show() {
    this.hidden = false;
    this.el.classList.remove('hidden');
  }

  updateForInterior() {
    this.el.textContent = 'WASD to move \u00B7 Mouse to look \u00B7 Esc to exit';
    this.el.classList.remove('hidden');
    this.hidden = false;
  }

  updateForStreet() {
    this.el.textContent = 'WASD to move \u00B7 Click to look \u00B7 Click house to enter';
    this.el.classList.remove('hidden');
    this.hidden = false;
  }
}
