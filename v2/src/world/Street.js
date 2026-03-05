import * as THREE from 'three';

export function createStreet(length) {
  const group = new THREE.Group();

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(60, length + 20);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0xf0ede8,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -length / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // Ground grid
  addGroundGrid(group, length);

  // Sidewalks — slightly raised strips
  const sidewalkMat = new THREE.MeshStandardMaterial({
    color: 0xf5f2ed,
    roughness: 0.9,
  });
  for (const xSign of [-1, 1]) {
    const swGeo = new THREE.BoxGeometry(3.5, 0.06, length + 10);
    const sidewalk = new THREE.Mesh(swGeo, sidewalkMat);
    sidewalk.position.set(xSign * 5.5, 0.03, -length / 2);
    sidewalk.castShadow = true;
    sidewalk.receiveShadow = true;
    group.add(sidewalk);
  }

  // Road surface
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0xe8e5e0,
    roughness: 1,
  });
  const roadGeo = new THREE.PlaneGeometry(8, length + 10);
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.005, -length / 2);
  road.receiveShadow = true;
  group.add(road);

  // Dashed center line
  const lineMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.08 });
  const centerPoints = [];
  for (let z = 0; z > -length; z -= 3) {
    centerPoints.push(new THREE.Vector3(0, 0.02, z));
    centerPoints.push(new THREE.Vector3(0, 0.02, z - 1.5));
  }
  const centerGeo = new THREE.BufferGeometry().setFromPoints(centerPoints);
  group.add(new THREE.LineSegments(centerGeo, lineMat));

  // Curb lines
  const curbMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12 });
  for (const xOffset of [-3.75, 3.75]) {
    const edgePoints = [
      new THREE.Vector3(xOffset, 0.07, 5),
      new THREE.Vector3(xOffset, 0.07, -length - 5),
    ];
    const edgeGeo = new THREE.BufferGeometry().setFromPoints(edgePoints);
    group.add(new THREE.Line(edgeGeo, curbMat));
  }

  // Trees
  addTrees(group, length);

  return group;
}

function addGroundGrid(group, length) {
  const gridMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.03 });
  const points = [];
  const extent = 25;
  const step = 2;

  // Lines along X
  for (let z = 5; z > -(length + 5); z -= step) {
    points.push(new THREE.Vector3(-extent, 0.003, z));
    points.push(new THREE.Vector3(extent, 0.003, z));
  }
  // Lines along Z
  for (let x = -extent; x <= extent; x += step) {
    points.push(new THREE.Vector3(x, 0.003, 5));
    points.push(new THREE.Vector3(x, 0.003, -(length + 5)));
  }

  const geo = new THREE.BufferGeometry().setFromPoints(points);
  group.add(new THREE.LineSegments(geo, gridMat));
}

function addTrees(group, length) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0xfaf8f5, roughness: 0.9 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0xf0ede8, roughness: 0.9 });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.5 });

  const treeSpacing = 8;
  const treeCount = Math.floor(length / treeSpacing);

  for (let i = 0; i < treeCount; i++) {
    const z = -(i * treeSpacing + 6);

    for (const xSign of [-1, 1]) {
      const x = xSign * 3.2;

      const trunkGeo = new THREE.CylinderGeometry(0.06, 0.08, 2.5, 6);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(x, 1.25, z);
      trunk.castShadow = true;
      group.add(trunk);

      const canopyR = 0.8 + Math.random() * 0.3;
      const canopyGeo = new THREE.IcosahedronGeometry(canopyR, 1);
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.set(x, 3.0 + Math.random() * 0.3, z);
      canopy.castShadow = true;
      canopy.receiveShadow = true;
      group.add(canopy);

      const canopyEdges = new THREE.EdgesGeometry(canopyGeo, 20);
      const canopyLines = new THREE.LineSegments(canopyEdges, edgeMat);
      canopyLines.position.copy(canopy.position);
      group.add(canopyLines);
    }
  }
}
