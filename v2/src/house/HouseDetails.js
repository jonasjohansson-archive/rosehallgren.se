import * as THREE from 'three';
import { createEdgedMesh } from '../materials/createEdgedMesh.js';

const lineMat = new THREE.LineBasicMaterial({ color: 0x000000 });

export function buildChimney(config, totalHeight) {
  const group = new THREE.Group();
  const { roofType, floorHeight } = config;

  if (roofType === 'flat') return group;

  const roofHeight = roofType === 'gable' ? floorHeight * 0.6 : floorHeight * 0.5;
  const chimneyHeight = roofHeight + 0.8;
  const chimneyW = 0.6;

  // Chimney body
  const bodyGeo = new THREE.BoxGeometry(chimneyW, chimneyHeight, chimneyW);
  const body = createEdgedMesh(bodyGeo);
  body.position.set(
    config.width * 0.2,
    totalHeight + 0.15 + chimneyHeight / 2,
    0
  );
  group.add(body);

  // Chimney cap
  const capGeo = new THREE.BoxGeometry(chimneyW + 0.12, 0.08, chimneyW + 0.12);
  const cap = createEdgedMesh(capGeo);
  cap.position.set(
    config.width * 0.2,
    totalHeight + 0.15 + chimneyHeight + 0.04,
    0
  );
  group.add(cap);

  return group;
}

export function buildPorch(config) {
  const group = new THREE.Group();
  const { width, depth, doorPosition } = config;
  const doorX = doorPosition === 'center' ? 0 : doorPosition === 'left' ? -width / 4 : width / 4;

  // 3 stepped boxes
  for (let i = 0; i < 3; i++) {
    const stepW = 1.4 - i * 0.1;
    const stepH = 0.08;
    const stepD = 0.35 - i * 0.05;
    const geo = new THREE.BoxGeometry(stepW, stepH, stepD);
    const step = createEdgedMesh(geo);
    step.position.set(
      doorX,
      0.15 + stepH / 2 + i * stepH,
      depth / 2 + 0.3 + i * stepD * 0.3
    );
    group.add(step);
  }

  // Porch posts
  const postHeight = 2.5;
  const postGeo = new THREE.BoxGeometry(0.08, postHeight, 0.08);
  for (const xOff of [-0.6, 0.6]) {
    const post = createEdgedMesh(postGeo);
    post.position.set(doorX + xOff, 0.15 + postHeight / 2, depth / 2 + 0.5);
    group.add(post);
  }

  // Porch overhang
  const overhangGeo = new THREE.BoxGeometry(1.6, 0.06, 0.6);
  const overhang = createEdgedMesh(overhangGeo);
  overhang.position.set(doorX, 0.15 + postHeight + 0.03, depth / 2 + 0.5);
  group.add(overhang);

  return group;
}

export function buildBalcony(config, floor) {
  const group = new THREE.Group();
  const { width, depth, floorHeight } = config;
  const balconyY = floor * floorHeight + 0.15;
  const balconyDepth = 1.0;

  // Floor slab
  const slabGeo = new THREE.BoxGeometry(width * 0.4, 0.08, balconyDepth);
  const slab = createEdgedMesh(slabGeo);
  slab.position.set(0, balconyY, depth / 2 + balconyDepth / 2);
  group.add(slab);

  // Railing (line segments)
  const railH = 1.0;
  const bw = width * 0.2;
  const bz = depth / 2 + balconyDepth;
  const by = balconyY;

  // Railing posts and top rail
  const railPoints = [
    // Left post
    new THREE.Vector3(-bw, by, bz),
    new THREE.Vector3(-bw, by + railH, bz),
    // Top rail
    new THREE.Vector3(-bw, by + railH, bz),
    new THREE.Vector3(bw, by + railH, bz),
    // Right post
    new THREE.Vector3(bw, by + railH, bz),
    new THREE.Vector3(bw, by, bz),
    // Side rails
    new THREE.Vector3(-bw, by, bz),
    new THREE.Vector3(-bw, by, depth / 2),
    new THREE.Vector3(-bw, by + railH, bz),
    new THREE.Vector3(-bw, by + railH, depth / 2),
    new THREE.Vector3(bw, by, bz),
    new THREE.Vector3(bw, by, depth / 2),
    new THREE.Vector3(bw, by + railH, bz),
    new THREE.Vector3(bw, by + railH, depth / 2),
  ];

  const railGeo = new THREE.BufferGeometry().setFromPoints(railPoints);
  const rail = new THREE.LineSegments(railGeo, lineMat);
  group.add(rail);

  // Vertical balusters
  const balusterCount = 5;
  const balusterPoints = [];
  for (let i = 0; i <= balusterCount; i++) {
    const x = -bw + (i / balusterCount) * bw * 2;
    balusterPoints.push(new THREE.Vector3(x, by, bz));
    balusterPoints.push(new THREE.Vector3(x, by + railH, bz));
  }
  const balusterGeo = new THREE.BufferGeometry().setFromPoints(balusterPoints);
  group.add(new THREE.LineSegments(balusterGeo, lineMat));

  return group;
}
