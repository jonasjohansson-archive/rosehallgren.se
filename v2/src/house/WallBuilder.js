import * as THREE from 'three';
import { createEdgedMesh } from '../materials/createEdgedMesh.js';

const WALL_THICKNESS = 0.2;

export function buildThickWall(wallWidth, wallHeight, openings) {
  const group = new THREE.Group();

  if (openings.length === 0) {
    const geo = new THREE.BoxGeometry(wallWidth, wallHeight, WALL_THICKNESS);
    group.add(createEdgedMesh(geo));
    return group;
  }

  const sorted = [...openings].sort((a, b) => a.x - b.x);

  const leftEdge = -wallWidth / 2;
  const rightEdge = wallWidth / 2;
  const bottomEdge = -wallHeight / 2;
  const topEdge = wallHeight / 2;

  for (let i = 0; i <= sorted.length; i++) {
    const stripLeft = i === 0 ? leftEdge : sorted[i - 1].x + sorted[i - 1].w / 2;
    const stripRight = i === sorted.length ? rightEdge : sorted[i].x - sorted[i].w / 2;
    const stripWidth = stripRight - stripLeft;

    if (stripWidth > 0.01) {
      const geo = new THREE.BoxGeometry(stripWidth, wallHeight, WALL_THICKNESS);
      const strip = createEdgedMesh(geo);
      strip.position.x = (stripLeft + stripRight) / 2;
      group.add(strip);
    }
  }

  for (const op of sorted) {
    const opTop = op.y + op.h / 2;
    const opBottom = op.y - op.h / 2;

    const lintelH = topEdge - opTop;
    if (lintelH > 0.01) {
      const geo = new THREE.BoxGeometry(op.w, lintelH, WALL_THICKNESS);
      const lintel = createEdgedMesh(geo);
      lintel.position.set(op.x, (opTop + topEdge) / 2, 0);
      group.add(lintel);
    }

    const sillH = opBottom - bottomEdge;
    if (sillH > 0.01) {
      const geo = new THREE.BoxGeometry(op.w, sillH, WALL_THICKNESS);
      const sill = createEdgedMesh(geo);
      sill.position.set(op.x, (bottomEdge + opBottom) / 2, 0);
      group.add(sill);
    }
  }

  return group;
}

// Open window — just the 4 frame pieces, no glass, no mullions
export function buildWindowFrame(opening) {
  const group = new THREE.Group();
  const frameDepth = 0.08;
  const frameThick = 0.06;
  const { x, y, w, h } = opening;

  const topGeo = new THREE.BoxGeometry(w + frameThick * 2, frameThick, frameDepth);
  const top = createEdgedMesh(topGeo);
  top.position.set(x, y + h / 2 + frameThick / 2, WALL_THICKNESS / 2);
  group.add(top);

  const bottomGeo = new THREE.BoxGeometry(w + frameThick * 2, frameThick, frameDepth);
  const bottom = createEdgedMesh(bottomGeo);
  bottom.position.set(x, y - h / 2 - frameThick / 2, WALL_THICKNESS / 2);
  group.add(bottom);

  const sideGeo = new THREE.BoxGeometry(frameThick, h, frameDepth);
  const left = createEdgedMesh(sideGeo);
  left.position.set(x - w / 2 - frameThick / 2, y, WALL_THICKNESS / 2);
  group.add(left);

  const right = createEdgedMesh(sideGeo.clone());
  right.position.set(x + w / 2 + frameThick / 2, y, WALL_THICKNESS / 2);
  group.add(right);

  return group;
}

// Open door — just frame + threshold
export function buildDoorFrame(config) {
  const group = new THREE.Group();
  const { width, depth, doorPosition } = config;
  const doorW = 1.2;
  const doorH = 2.2;
  const doorX = doorPosition === 'center' ? 0 : doorPosition === 'left' ? -width / 4 : width / 4;

  const frameThick = 0.08;
  const frameDepth = WALL_THICKNESS + 0.04;

  const topGeo = new THREE.BoxGeometry(doorW + frameThick * 2, frameThick, frameDepth);
  const top = createEdgedMesh(topGeo);
  top.position.set(doorX, doorH + 0.15 + frameThick / 2, depth / 2);
  group.add(top);

  const sideGeo = new THREE.BoxGeometry(frameThick, doorH, frameDepth);
  const left = createEdgedMesh(sideGeo);
  left.position.set(doorX - doorW / 2 - frameThick / 2, doorH / 2 + 0.15, depth / 2);
  group.add(left);

  const right = createEdgedMesh(sideGeo.clone());
  right.position.set(doorX + doorW / 2 + frameThick / 2, doorH / 2 + 0.15, depth / 2);
  group.add(right);

  const threshGeo = new THREE.BoxGeometry(doorW + 0.3, 0.06, 0.25);
  const thresh = createEdgedMesh(threshGeo);
  thresh.position.set(doorX, 0.03 + 0.15, depth / 2 + 0.12);
  group.add(thresh);

  return group;
}

export { WALL_THICKNESS };
