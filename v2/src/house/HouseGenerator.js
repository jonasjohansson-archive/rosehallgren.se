import * as THREE from 'three';
import { createEdgedMesh } from '../materials/createEdgedMesh.js';
import { buildThickWall, buildWindowFrame, buildDoorFrame, WALL_THICKNESS } from './WallBuilder.js';
import { buildRoof } from './RoofBuilder.js';
import { buildChimney, buildPorch, buildBalcony } from './HouseDetails.js';

export function generateHouse(config, images) {
  const house = new THREE.Group();

  const { width, depth, floors, floorHeight, roofType, windowsPerWall, doorPosition } = config;
  const totalHeight = floors * floorHeight;
  const winW = 1.0;
  const winH = 1.2;
  const doorW = 1.2;
  const doorH = 2.2;

  // Foundation
  const foundation = createEdgedMesh(new THREE.BoxGeometry(width + 0.2, 0.15, depth + 0.2));
  foundation.position.y = 0.075;
  house.add(foundation);

  // Floor slabs
  for (let f = 0; f < floors; f++) {
    const slab = createEdgedMesh(new THREE.BoxGeometry(width, 0.08, depth));
    slab.position.y = f * floorHeight + 0.15 + 0.04;
    house.add(slab);
  }

  // Walls
  const sideCount = Math.max(1, windowsPerWall - 1);

  const backOpenings = getWindowPositions(width, floors, floorHeight, windowsPerWall, winW, winH);
  const backWall = buildThickWall(width, totalHeight, backOpenings);
  backWall.position.set(0, totalHeight / 2 + 0.15, -depth / 2);
  backWall.rotation.y = Math.PI;
  house.add(backWall);

  const sideOpenings = getWindowPositions(depth, floors, floorHeight, sideCount, winW, winH);
  const leftWall = buildThickWall(depth, totalHeight, sideOpenings);
  leftWall.position.set(-width / 2, totalHeight / 2 + 0.15, 0);
  leftWall.rotation.y = Math.PI / 2;
  house.add(leftWall);

  const rightWall = buildThickWall(depth, totalHeight, sideOpenings);
  rightWall.position.set(width / 2, totalHeight / 2 + 0.15, 0);
  rightWall.rotation.y = -Math.PI / 2;
  house.add(rightWall);

  const frontOpenings = getWindowPositions(width, floors, floorHeight, windowsPerWall, winW, winH);
  const doorX = doorPosition === 'center' ? 0 : doorPosition === 'left' ? -width / 4 : width / 4;
  const frontDoor = { x: doorX, y: doorH / 2 - totalHeight / 2 + 0.15, w: doorW, h: doorH };
  const frontWall = buildThickWall(width, totalHeight, [...frontOpenings, frontDoor]);
  frontWall.position.set(0, totalHeight / 2 + 0.15, depth / 2);
  house.add(frontWall);

  // Window frames
  const allWindowSets = [
    { openings: frontOpenings, pos: [0, totalHeight / 2 + 0.15, depth / 2], rotY: 0 },
    { openings: backOpenings, pos: [0, totalHeight / 2 + 0.15, -depth / 2], rotY: Math.PI },
    { openings: sideOpenings, pos: [-width / 2, totalHeight / 2 + 0.15, 0], rotY: Math.PI / 2 },
    { openings: sideOpenings, pos: [width / 2, totalHeight / 2 + 0.15, 0], rotY: -Math.PI / 2 },
  ];

  for (const wallSet of allWindowSets) {
    for (const win of wallSet.openings) {
      const frame = buildWindowFrame(win);
      frame.position.set(...wallSet.pos);
      frame.rotation.y = wallSet.rotY;
      house.add(frame);
    }
  }

  // Door frame
  const doorFrame = buildDoorFrame(config);
  house.add(doorFrame);

  // Interior image walls
  if (images && images.length > 0) {
    house.add(createInteriorImageWalls(config, images));
  }

  // Details
  house.add(buildChimney(config, totalHeight));
  house.add(buildPorch(config));

  if (floors >= 2) {
    house.add(buildBalcony(config, 1));
  }

  // Roof
  house.add(buildRoof(width, depth, totalHeight, roofType, floorHeight));

  return house;
}


function getWindowPositions(wallWidth, floors, floorHeight, countPerFloor, winW, winH) {
  const openings = [];
  const totalHeight = floors * floorHeight;

  for (let f = 0; f < floors; f++) {
    const floorBase = f * floorHeight - totalHeight / 2;
    const sillY = floorBase + floorHeight * 0.4;
    const centerY = sillY + winH / 2;

    for (let w = 0; w < countPerFloor; w++) {
      const spacing = wallWidth / (countPerFloor + 1);
      const x = -wallWidth / 2 + spacing * (w + 1);
      openings.push({ x, y: centerY, w: winW, h: winH });
    }
  }

  return openings;
}

function createInteriorImageWalls(config, images) {
  const group = new THREE.Group();
  const { width, depth, floors, floorHeight } = config;
  const loader = new THREE.TextureLoader();
  const inset = 0.3;
  const innerW = width - inset * 2;
  const innerD = depth - inset * 2;

  for (let f = 0; f < floors; f++) {
    const floorY = f * floorHeight + 0.15;
    const wallH = floorHeight - 0.1;

    const base = f * 3;
    const backImg = images[base % images.length];
    const leftImg = images[(base + 1) % images.length];
    const rightImg = images[(base + 2) % images.length];

    const backTex = loader.load(backImg);
    backTex.colorSpace = THREE.SRGBColorSpace;
    const backMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(innerW, wallH),
      new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.7, side: THREE.FrontSide })
    );
    backMesh.position.set(0, floorY + wallH / 2, -innerD / 2);
    group.add(backMesh);

    const leftTex = loader.load(leftImg);
    leftTex.colorSpace = THREE.SRGBColorSpace;
    const leftMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(innerD, wallH),
      new THREE.MeshStandardMaterial({ map: leftTex, roughness: 0.7, side: THREE.FrontSide })
    );
    leftMesh.position.set(-innerW / 2, floorY + wallH / 2, 0);
    leftMesh.rotation.y = Math.PI / 2;
    group.add(leftMesh);

    const rightTex = loader.load(rightImg);
    rightTex.colorSpace = THREE.SRGBColorSpace;
    const rightMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(innerD, wallH),
      new THREE.MeshStandardMaterial({ map: rightTex, roughness: 0.7, side: THREE.FrontSide })
    );
    rightMesh.position.set(innerW / 2, floorY + wallH / 2, 0);
    rightMesh.rotation.y = -Math.PI / 2;
    group.add(rightMesh);

    // Floor
    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(innerW, innerD),
      new THREE.MeshStandardMaterial({ color: 0xe8e0d8, roughness: 0.9, side: THREE.FrontSide })
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = floorY + 0.01;
    group.add(floorMesh);

    // Ceiling
    const ceilMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(innerW, innerD),
      new THREE.MeshStandardMaterial({ color: 0xfaf8f5, roughness: 0.8, side: THREE.FrontSide })
    );
    ceilMesh.rotation.x = Math.PI / 2;
    ceilMesh.position.y = floorY + floorHeight - 0.01;
    group.add(ceilMesh);

    const light = new THREE.PointLight(0xfff4e0, 1.5, Math.max(innerW, innerD) * 2);
    light.position.set(0, floorY + floorHeight - 0.3, 0);
    group.add(light);
  }

  return group;
}
