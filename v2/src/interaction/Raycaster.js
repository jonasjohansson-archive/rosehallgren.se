import * as THREE from 'three';

export class HouseRaycaster {
  constructor(camera, renderer) {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.camera = camera;
    this.houseGroups = [];
    this.clickCallback = null;
    this.renderer = renderer;

    this.handleClick = this.handleClick.bind(this);
    this.handleTap = this.handleTap.bind(this);

    renderer.domElement.addEventListener('click', this.handleClick);
    renderer.domElement.addEventListener('touchend', this.handleTap);
  }

  setHouses(houses) {
    this.houseGroups = houses;
  }

  onHouseClick(cb) {
    this.clickCallback = cb;
  }

  handleClick(e) {
    this.castRay(e.clientX, e.clientY);
  }

  handleTap(e) {
    if (e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      this.castRay(touch.clientX, touch.clientY);
    }
  }

  castRay(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    for (const house of this.houseGroups) {
      const intersects = this.raycaster.intersectObject(house, true);
      if (intersects.length > 0) {
        this.clickCallback?.(house);
        return;
      }
    }
  }
}
