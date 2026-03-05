import * as THREE from 'three';

export const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0xe8e0d8,
  roughness: 0.9,
  side: THREE.DoubleSide,
});

export const wallMaterial = new THREE.MeshStandardMaterial({
  color: 0xf5f0eb,
  roughness: 0.8,
  side: THREE.DoubleSide,
});

export const accentWallMaterial = new THREE.MeshStandardMaterial({
  color: 0xd4c5b5,
  roughness: 0.7,
  side: THREE.DoubleSide,
});

export const frameMaterial = new THREE.MeshStandardMaterial({
  color: 0x333333,
  roughness: 0.5,
});

export const ceilingMaterial = new THREE.MeshStandardMaterial({
  color: 0xfaf8f5,
  roughness: 0.8,
  side: THREE.DoubleSide,
});
