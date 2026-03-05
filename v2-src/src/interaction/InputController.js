export class InputController {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.enabled = false;
    this.pointerLocked = false;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onClick = this._onClick.bind(this);
    this._onPointerLockChange = this._onPointerLockChange.bind(this);

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('click', this._onClick);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
  }

  enable() {
    this.enabled = true;
    this.keys = {};
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
  }

  disable() {
    this.enabled = false;
    this.keys = {};
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    }
    this.pointerLocked = false;
  }

  getMoveDirection() {
    if (!this.enabled) return { x: 0, z: 0 };

    let x = 0;
    let z = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) z += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) z -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) x += 1;

    return { x, z };
  }

  consumeMouseDelta() {
    if (!this.enabled) return { dx: 0, dy: 0 };
    const result = { dx: this.mouseDeltaX, dy: this.mouseDeltaY };
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    return result;
  }

  _onKeyDown(e) {
    if (!this.enabled) return;
    this.keys[e.code] = true;
  }

  _onKeyUp(e) {
    this.keys[e.code] = false;
  }

  _onMouseMove(e) {
    if (!this.enabled || !this.pointerLocked) return;
    this.mouseDeltaX += e.movementX;
    this.mouseDeltaY += e.movementY;
  }

  _onClick() {
    if (!this.enabled) return;
    if (document.pointerLockElement !== this.canvas) {
      this.canvas.requestPointerLock();
    }
  }

  _onPointerLockChange() {
    this.pointerLocked = document.pointerLockElement === this.canvas;
  }

  // Touch controls for mobile
  setupTouchControls() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoveId = null;
    let touchLookId = null;

    this.canvas.addEventListener('touchstart', (e) => {
      if (!this.enabled) return;
      for (const touch of e.changedTouches) {
        const x = touch.clientX / window.innerWidth;
        if (x < 0.5) {
          // Left half = virtual joystick
          touchMoveId = touch.identifier;
          touchStartX = touch.clientX;
          touchStartY = touch.clientY;
        } else {
          // Right half = look
          touchLookId = touch.identifier;
          touchStartX = touch.clientX;
          touchStartY = touch.clientY;
        }
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (!this.enabled) return;
      for (const touch of e.changedTouches) {
        if (touch.identifier === touchMoveId) {
          const dx = touch.clientX - touchStartX;
          const dy = touch.clientY - touchStartY;
          const deadzone = 10;
          this.keys['KeyW'] = dy < -deadzone;
          this.keys['KeyS'] = dy > deadzone;
          this.keys['KeyA'] = dx < -deadzone;
          this.keys['KeyD'] = dx > deadzone;
        }
        if (touch.identifier === touchLookId) {
          this.mouseDeltaX += (touch.clientX - touchStartX) * 0.5;
          this.mouseDeltaY += (touch.clientY - touchStartY) * 0.5;
          touchStartX = touch.clientX;
          touchStartY = touch.clientY;
        }
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier === touchMoveId) {
          touchMoveId = null;
          this.keys['KeyW'] = false;
          this.keys['KeyS'] = false;
          this.keys['KeyA'] = false;
          this.keys['KeyD'] = false;
        }
        if (touch.identifier === touchLookId) {
          touchLookId = null;
        }
      }
    }, { passive: true });
  }
}
