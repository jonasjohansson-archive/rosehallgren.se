import * as THREE from 'three';

const subtleMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.1 });
const dashedMat = new THREE.LineDashedMaterial({
  color: 0x000000,
  transparent: true,
  opacity: 0.08,
  dashSize: 0.3,
  gapSize: 0.3,
});

export function createSiteDetails(lots, projects) {
  const group = new THREE.Group();

  for (let i = 0; i < lots.length; i++) {
    const lot = lots[i];
    const config = projects[i].house;

    addLotLines(group, lot, config);
    addWalkway(group, lot, config);
  }

  addScaleFigures(group, lots);

  return group;
}

function addLotLines(group, lot, config) {
  const pad = 2;
  const hw = config.width / 2 + pad;
  const hd = config.depth / 2 + pad;
  const y = 0.02;

  // Dashed rectangle in world space around the lot
  const cos = Math.cos(lot.rotationY);
  const sin = Math.sin(lot.rotationY);

  const corners = [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ];

  // Transform local corners to world space
  const worldCorners = corners.map(([lx, lz]) => {
    const wx = lot.x + lx * cos + lz * sin;
    const wz = lot.z - lx * sin + lz * cos;
    return new THREE.Vector3(wx, y, wz);
  });

  // 4 sides as dashed lines
  for (let c = 0; c < 4; c++) {
    const a = worldCorners[c];
    const b = worldCorners[(c + 1) % 4];
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    const line = new THREE.Line(geo, dashedMat);
    line.computeLineDistances();
    group.add(line);
  }
}

function addWalkway(group, lot, config) {
  const y = 0.02;

  // Door is on the front face (+Z local, which is toward the street)
  const doorX = config.doorPosition === 'center' ? 0 : config.doorPosition === 'left' ? -config.width / 4 : config.width / 4;

  const cos = Math.cos(lot.rotationY);
  const sin = Math.sin(lot.rotationY);

  // Door position in world space (at front face)
  const doorLocalZ = config.depth / 2 + 0.5;
  const doorWX = lot.x + doorX * cos + doorLocalZ * sin;
  const doorWZ = lot.z - doorX * sin + doorLocalZ * cos;

  // Sidewalk edge position (extend toward street center x=0)
  const sidewalkX = lot.side === 'left' ? lot.x + 3.5 : lot.x - 3.5;

  const points = [
    new THREE.Vector3(doorWX, y, doorWZ),
    new THREE.Vector3(sidewalkX, y, doorWZ),
  ];

  const geo = new THREE.BufferGeometry().setFromPoints(points);
  group.add(new THREE.Line(geo, subtleMat));
}

function addScaleFigures(group, lots) {
  const figureMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15 });

  // Place a few figures near some houses
  const figurePositions = [];
  for (let i = 0; i < lots.length; i += 2) {
    const lot = lots[i];
    // Place figure on the sidewalk near the house
    const fx = lot.side === 'left' ? lot.x + 4 : lot.x - 4;
    figurePositions.push({ x: fx, z: lot.z + 1 });
    if (i + 1 < lots.length) {
      const lot2 = lots[i + 1];
      const fx2 = lot2.side === 'left' ? lot2.x + 3 : lot2.x - 3;
      figurePositions.push({ x: fx2, z: lot2.z - 0.5 });
    }
  }

  for (const pos of figurePositions) {
    const figure = createScaleFigure(figureMat);
    figure.position.set(pos.x, 0, pos.z);
    // Random rotation
    figure.rotation.y = Math.random() * Math.PI * 2;
    group.add(figure);
  }
}

function createScaleFigure(mat) {
  // Minimal stick figure — ~1.75m tall
  const points = [
    // Body line (feet to neck)
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 1.3, 0),
    // Neck to head top
    new THREE.Vector3(0, 1.3, 0),
    new THREE.Vector3(0, 1.75, 0),
    // Arms
    new THREE.Vector3(-0.3, 1.1, 0),
    new THREE.Vector3(0.3, 1.1, 0),
    // Legs
    new THREE.Vector3(0, 0.75, 0),
    new THREE.Vector3(-0.2, 0, 0),
    new THREE.Vector3(0, 0.75, 0),
    new THREE.Vector3(0.2, 0, 0),
  ];

  // Head circle (small octagon)
  const headR = 0.12;
  const headY = 1.55;
  const segments = 8;
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * Math.PI * 2;
    const a2 = ((i + 1) / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(a1) * headR, headY + Math.sin(a1) * headR, 0));
    points.push(new THREE.Vector3(Math.cos(a2) * headR, headY + Math.sin(a2) * headR, 0));
  }

  const geo = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.LineSegments(geo, mat);
}
