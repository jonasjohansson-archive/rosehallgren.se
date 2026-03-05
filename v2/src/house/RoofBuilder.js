import * as THREE from 'three';
import { createEdgedMesh } from '../materials/createEdgedMesh.js';

export function buildRoof(width, depth, wallHeight, roofType, floorHeight) {
  const group = new THREE.Group();
  const roofBase = wallHeight + 0.15;

  if (roofType === 'flat') {
    buildFlatRoof(group, width, depth, roofBase);
  } else if (roofType === 'gable') {
    const roofHeight = floorHeight * 0.6;
    buildGableRoof(group, width, depth, roofBase, roofHeight);
  } else if (roofType === 'hip') {
    const roofHeight = floorHeight * 0.5;
    buildHipRoof(group, width, depth, roofBase, roofHeight);
  }

  return group;
}

function buildFlatRoof(group, width, depth, roofBase) {
  const overhang = 0.5;
  const geo = new THREE.BoxGeometry(width + overhang * 2, 0.15, depth + overhang * 2);
  const slab = createEdgedMesh(geo);
  slab.position.y = roofBase + 0.075;
  group.add(slab);

  // Fascia boards along eave
  addFasciaBoards(group, width + overhang * 2, depth + overhang * 2, roofBase);

  // Rafter tips
  addRafterTips(group, width + overhang * 2, depth + overhang * 2, roofBase);
}

function buildGableRoof(group, width, depth, roofBase, roofHeight) {
  const overhang = 0.5;
  const hw = width / 2 + overhang;
  const hd = depth / 2 + overhang;

  const vertices = new Float32Array([
    // Front gable face
    -hw, roofBase, hd,
    hw, roofBase, hd,
    0, roofBase + roofHeight, hd,

    // Back gable face
    -hw, roofBase, -hd,
    0, roofBase + roofHeight, -hd,
    hw, roofBase, -hd,

    // Left slope
    -hw, roofBase, hd,
    0, roofBase + roofHeight, hd,
    0, roofBase + roofHeight, -hd,

    -hw, roofBase, hd,
    0, roofBase + roofHeight, -hd,
    -hw, roofBase, -hd,

    // Right slope
    hw, roofBase, hd,
    0, roofBase + roofHeight, -hd,
    0, roofBase + roofHeight, hd,

    hw, roofBase, hd,
    hw, roofBase, -hd,
    0, roofBase + roofHeight, -hd,
  ]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geo.computeVertexNormals();
  group.add(createEdgedMesh(geo));

  // Fascia along the two eave edges
  const fasciaGeo = new THREE.BoxGeometry(0.04, 0.12, depth + overhang * 2);
  const fasciaLeft = createEdgedMesh(fasciaGeo);
  fasciaLeft.position.set(-hw, roofBase + 0.06, 0);
  group.add(fasciaLeft);

  const fasciaRight = createEdgedMesh(fasciaGeo);
  fasciaRight.position.set(hw, roofBase + 0.06, 0);
  group.add(fasciaRight);

  // Rafter tips along eaves
  const rafterSpacing = 1.5;
  const rafterCount = Math.floor((depth + overhang * 2) / rafterSpacing);
  for (let i = 0; i <= rafterCount; i++) {
    const z = -hd + i * rafterSpacing;
    for (const xPos of [-hw, hw]) {
      const rGeo = new THREE.BoxGeometry(0.08, 0.15, 0.08);
      const rafter = createEdgedMesh(rGeo);
      rafter.position.set(xPos, roofBase - 0.075, z);
      group.add(rafter);
    }
  }
}

function buildHipRoof(group, width, depth, roofBase, roofHeight) {
  const overhang = 0.3;
  const hw = width / 2 + overhang;
  const hd = depth / 2 + overhang;
  const ridgeLen = Math.max(0, (depth - width) * 0.3);

  const vertices = new Float32Array([
    // Front face
    -hw, roofBase, hd,
    hw, roofBase, hd,
    ridgeLen > 0 ? ridgeLen / 2 : 0, roofBase + roofHeight, ridgeLen > 0 ? ridgeLen / 2 : 0,

    -hw, roofBase, hd,
    ridgeLen > 0 ? ridgeLen / 2 : 0, roofBase + roofHeight, ridgeLen > 0 ? ridgeLen / 2 : 0,
    ridgeLen > 0 ? -ridgeLen / 2 : 0, roofBase + roofHeight, ridgeLen > 0 ? -ridgeLen / 2 : 0,

    // Back face
    hw, roofBase, -hd,
    -hw, roofBase, -hd,
    ridgeLen > 0 ? -ridgeLen / 2 : 0, roofBase + roofHeight, ridgeLen > 0 ? -ridgeLen / 2 : 0,

    hw, roofBase, -hd,
    ridgeLen > 0 ? -ridgeLen / 2 : 0, roofBase + roofHeight, ridgeLen > 0 ? -ridgeLen / 2 : 0,
    ridgeLen > 0 ? ridgeLen / 2 : 0, roofBase + roofHeight, ridgeLen > 0 ? ridgeLen / 2 : 0,

    // Left face
    -hw, roofBase, -hd,
    -hw, roofBase, hd,
    ridgeLen > 0 ? -ridgeLen / 2 : 0, roofBase + roofHeight, ridgeLen > 0 ? -ridgeLen / 2 : 0,

    -hw, roofBase, hd,
    ridgeLen > 0 ? ridgeLen / 2 : 0, roofBase + roofHeight, ridgeLen > 0 ? ridgeLen / 2 : 0,
    ridgeLen > 0 ? -ridgeLen / 2 : 0, roofBase + roofHeight, ridgeLen > 0 ? -ridgeLen / 2 : 0,

    // Right face
    hw, roofBase, hd,
    hw, roofBase, -hd,
    ridgeLen > 0 ? ridgeLen / 2 : 0, roofBase + roofHeight, ridgeLen > 0 ? ridgeLen / 2 : 0,

    hw, roofBase, -hd,
    ridgeLen > 0 ? -ridgeLen / 2 : 0, roofBase + roofHeight, ridgeLen > 0 ? -ridgeLen / 2 : 0,
    ridgeLen > 0 ? ridgeLen / 2 : 0, roofBase + roofHeight, ridgeLen > 0 ? ridgeLen / 2 : 0,
  ]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geo.computeVertexNormals();
  group.add(createEdgedMesh(geo));

  // Fascia and rafter tips
  addFasciaBoards(group, hw * 2, hd * 2, roofBase);
  addRafterTips(group, hw * 2, hd * 2, roofBase);
}

function addFasciaBoards(group, totalWidth, totalDepth, roofBase) {
  const hw = totalWidth / 2;
  const hd = totalDepth / 2;

  // Front fascia
  const frontGeo = new THREE.BoxGeometry(totalWidth, 0.1, 0.03);
  const front = createEdgedMesh(frontGeo);
  front.position.set(0, roofBase + 0.05, hd);
  group.add(front);

  // Back fascia
  const back = createEdgedMesh(frontGeo);
  back.position.set(0, roofBase + 0.05, -hd);
  group.add(back);

  // Side fascias
  const sideGeo = new THREE.BoxGeometry(0.03, 0.1, totalDepth);
  const leftFascia = createEdgedMesh(sideGeo);
  leftFascia.position.set(-hw, roofBase + 0.05, 0);
  group.add(leftFascia);

  const rightFascia = createEdgedMesh(sideGeo);
  rightFascia.position.set(hw, roofBase + 0.05, 0);
  group.add(rightFascia);
}

function addRafterTips(group, totalWidth, totalDepth, roofBase) {
  const hw = totalWidth / 2;
  const hd = totalDepth / 2;
  const spacing = 1.5;

  // Along front and back
  const countX = Math.floor(totalWidth / spacing);
  for (let i = 0; i <= countX; i++) {
    const x = -hw + i * spacing;
    for (const zPos of [hd, -hd]) {
      const geo = new THREE.BoxGeometry(0.08, 0.15, 0.08);
      const rafter = createEdgedMesh(geo);
      rafter.position.set(x, roofBase - 0.075, zPos);
      group.add(rafter);
    }
  }

  // Along sides
  const countZ = Math.floor(totalDepth / spacing);
  for (let i = 0; i <= countZ; i++) {
    const z = -hd + i * spacing;
    for (const xPos of [-hw, hw]) {
      const geo = new THREE.BoxGeometry(0.08, 0.15, 0.08);
      const rafter = createEdgedMesh(geo);
      rafter.position.set(xPos, roofBase - 0.075, z);
      group.add(rafter);
    }
  }
}
