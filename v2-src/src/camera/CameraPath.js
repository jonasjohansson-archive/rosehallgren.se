import * as THREE from 'three';

export function createCameraPath(streetLength) {
  const points = [];
  const eyeHeight = 1.7;

  points.push(new THREE.Vector3(0, eyeHeight, 5));

  const steps = 20;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const z = 5 - t * (streetLength + 10);
    const x = Math.sin(t * Math.PI * 3) * 1.2;
    points.push(new THREE.Vector3(x, eyeHeight, z));
  }

  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.3);
}

export function createAvatarPath(streetLength) {
  const points = [];

  points.push(new THREE.Vector3(0, 0, 5));

  const steps = 20;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const z = 5 - t * (streetLength + 10);
    const x = Math.sin(t * Math.PI * 3) * 1.2;
    points.push(new THREE.Vector3(x, 0, z));
  }

  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.3);
}
