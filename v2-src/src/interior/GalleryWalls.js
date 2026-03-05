import * as THREE from 'three';
import { frameMaterial } from '../materials/InteriorMaterials.js';

const loader = new THREE.TextureLoader();

export function createGalleryImages(images, wallWidth, wallHeight, floorY) {
  const group = new THREE.Group();
  const imgWidth = 1.2;
  const imgHeight = 0.9;
  const frameThick = 0.04;
  const frameDepth = 0.06;
  const eyeY = floorY + 1.5;

  const perWall = Math.ceil(images.length / 3);
  const walls = [
    { axis: 'back', images: images.slice(0, perWall) },
    { axis: 'left', images: images.slice(perWall, perWall * 2) },
    { axis: 'right', images: images.slice(perWall * 2) },
  ];

  const hw = wallWidth / 2 - 0.3;
  const inset = 0.02;

  for (const wall of walls) {
    if (wall.images.length === 0) continue;
    const count = wall.images.length;
    const spacing = (hw * 2) / (count + 1);

    for (let i = 0; i < count; i++) {
      const imgUrl = wall.images[i];
      const pos = new THREE.Vector3();
      const rot = new THREE.Euler();

      const offset = -hw + spacing * (i + 1);

      if (wall.axis === 'back') {
        pos.set(offset, eyeY, -hw + inset);
        rot.set(0, 0, 0);
      } else if (wall.axis === 'left') {
        pos.set(-hw + inset, eyeY, offset);
        rot.set(0, Math.PI / 2, 0);
      } else {
        pos.set(hw - inset, eyeY, offset);
        rot.set(0, -Math.PI / 2, 0);
      }

      const imgGroup = createFramedImage(imgUrl, imgWidth, imgHeight, frameThick, frameDepth);
      imgGroup.position.copy(pos);
      imgGroup.rotation.copy(rot);
      group.add(imgGroup);
    }
  }

  return group;
}

function createFramedImage(url, w, h, frameThick, frameDepth) {
  const group = new THREE.Group();

  // Image plane
  const tex = loader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  const imgMat = new THREE.MeshStandardMaterial({ map: tex });
  const imgGeo = new THREE.PlaneGeometry(w, h);
  const imgMesh = new THREE.Mesh(imgGeo, imgMat);
  imgMesh.position.z = frameDepth / 2 + 0.001;
  group.add(imgMesh);

  // Frame pieces
  // Top
  const topGeo = new THREE.BoxGeometry(w + frameThick * 2, frameThick, frameDepth);
  const top = new THREE.Mesh(topGeo, frameMaterial);
  top.position.set(0, h / 2 + frameThick / 2, 0);
  group.add(top);

  // Bottom
  const bottom = new THREE.Mesh(topGeo, frameMaterial);
  bottom.position.set(0, -h / 2 - frameThick / 2, 0);
  group.add(bottom);

  // Left
  const sideGeo = new THREE.BoxGeometry(frameThick, h + frameThick * 2, frameDepth);
  const left = new THREE.Mesh(sideGeo, frameMaterial);
  left.position.set(-w / 2 - frameThick / 2, 0, 0);
  group.add(left);

  // Right
  const right = new THREE.Mesh(sideGeo, frameMaterial);
  right.position.set(w / 2 + frameThick / 2, 0, 0);
  group.add(right);

  return group;
}

export function disposeGallery(group) {
  group.traverse((child) => {
    if (child.isMesh) {
      child.geometry.dispose();
      if (child.material.map) child.material.map.dispose();
      if (child.material !== frameMaterial) child.material.dispose();
    }
  });
}
