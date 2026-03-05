import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export class HouseLabels {
  constructor(container) {
    this.labelRenderer = new CSS2DRenderer({ element: container });
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.labels = [];

    window.addEventListener('resize', () => {
      this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  addLabel(text, house, height, onClick) {
    const el = document.createElement('div');
    el.className = 'house-label';
    el.textContent = text;
    el.addEventListener('click', onClick);

    const label = new CSS2DObject(el);
    label.position.set(0, height + 1.5, 0);
    house.add(label);

    this.labels.push(label);
    return label;
  }

  render(scene, camera) {
    this.labelRenderer.render(scene, camera);
  }
}
