import * as THREE from 'three';

export const whiteMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.95,
  metalness: 0,
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
});

export const edgeMaterial = new THREE.LineBasicMaterial({
  color: 0x222222,
  transparent: true,
  opacity: 0.6,
});

export function createEdgedMesh(geometry, thresholdAngle = 15) {
  const group = new THREE.Group();

  const mesh = new THREE.Mesh(geometry, whiteMaterial);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  const edges = new THREE.EdgesGeometry(geometry, thresholdAngle);
  const lines = new THREE.LineSegments(edges, edgeMaterial);
  group.add(lines);

  return group;
}
