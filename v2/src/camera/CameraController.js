import * as THREE from 'three';

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();

export class CameraController {
  constructor(camera) {
    this.camera = camera;
    this.mode = 'first-person';

    // First-person
    this.playerPos = new THREE.Vector3(0, 1.7, 5);
    this.yaw = 0;
    this.pitch = 0;

    // Walk bob
    this.bobPhase = 0;
    this.bobAmount = 0;

    // Top-down
    this.topDownHeight = 50;
    this.topDownTarget = new THREE.Vector3(0, 0, -20);

    // Init
    this.camera.position.copy(this.playerPos);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(0, 0, 0);
  }

  toggleTopDown() {
    if (this.mode === 'first-person') {
      this.mode = 'top-down';
      this.topDownTarget.set(this.playerPos.x, 0, this.playerPos.z);
    } else {
      this.mode = 'first-person';
    }
  }

  updateFirstPerson(inputDir, mouseDelta, delta) {
    if (this.mode === 'top-down') {
      this._updateTopDown(inputDir, mouseDelta, delta);
      return;
    }

    // Mouse look
    if (mouseDelta) {
      this.yaw -= mouseDelta.dx * 0.002;
      this.pitch -= mouseDelta.dy * 0.002;
      this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch));
    }

    // Movement
    const speed = 5.0;
    _forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const moveX = inputDir.x * speed * delta;
    const moveZ = inputDir.z * speed * delta;
    this.playerPos.addScaledVector(_forward, moveZ);
    this.playerPos.addScaledVector(_right, moveX);

    // Walk bob
    const isMoving = Math.abs(inputDir.x) > 0.01 || Math.abs(inputDir.z) > 0.01;
    if (isMoving) {
      this.bobPhase += delta * 10;
      this.bobAmount = THREE.MathUtils.lerp(this.bobAmount, 1, delta * 8);
    } else {
      this.bobAmount = THREE.MathUtils.lerp(this.bobAmount, 0, delta * 6);
    }

    const bobY = Math.sin(this.bobPhase) * 0.03 * this.bobAmount;
    const bobX = Math.cos(this.bobPhase * 0.5) * 0.015 * this.bobAmount;

    this.playerPos.y = 1.7;

    this.camera.position.set(
      this.playerPos.x + bobX,
      this.playerPos.y + bobY,
      this.playerPos.z
    );
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  _updateTopDown(inputDir, mouseDelta, delta) {
    const speed = 15.0;
    this.topDownTarget.x += inputDir.x * speed * delta;
    this.topDownTarget.z -= inputDir.z * speed * delta;

    if (mouseDelta && Math.abs(mouseDelta.dy) > 0) {
      this.topDownHeight += mouseDelta.dy * 0.05;
      this.topDownHeight = Math.max(15, Math.min(120, this.topDownHeight));
    }

    this.camera.position.lerp(
      new THREE.Vector3(this.topDownTarget.x, this.topDownHeight, this.topDownTarget.z + 5),
      delta * 5
    );
    this.camera.rotation.set(-Math.PI / 2, 0, 0);

    this.playerPos.set(this.topDownTarget.x, 1.7, this.topDownTarget.z);
  }
}
