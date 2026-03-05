import * as THREE from 'three';
import { createEdgedMesh } from '../materials/createEdgedMesh.js';

export function createFurniture(floorWidth, floorDepth, floorY) {
  const group = new THREE.Group();

  // Position table + chairs off to one side so they don't block walking
  const tableX = floorWidth * 0.25;
  const tableZ = floorDepth * 0.2;

  group.add(createTable(tableX, floorY, tableZ));
  group.add(createChair(tableX - 0.6, floorY, tableZ + 0.5, 0));
  group.add(createChair(tableX + 0.6, floorY, tableZ + 0.5, 0));

  return group;
}

function createTable(x, floorY, z) {
  const group = new THREE.Group();
  const topH = 0.05;
  const topW = 1.0;
  const topD = 0.6;
  const legH = 0.7;
  const legW = 0.06;

  // Table top
  const topGeo = new THREE.BoxGeometry(topW, topH, topD);
  const top = createEdgedMesh(topGeo);
  top.position.set(x, floorY + legH + topH / 2, z);
  group.add(top);

  // 4 legs
  const legGeo = new THREE.BoxGeometry(legW, legH, legW);
  const offsets = [
    [-topW / 2 + legW, -topD / 2 + legW],
    [topW / 2 - legW, -topD / 2 + legW],
    [-topW / 2 + legW, topD / 2 - legW],
    [topW / 2 - legW, topD / 2 - legW],
  ];
  for (const [ox, oz] of offsets) {
    const leg = createEdgedMesh(legGeo);
    leg.position.set(x + ox, floorY + legH / 2, z + oz);
    group.add(leg);
  }

  return group;
}

function createChair(x, floorY, z, rotY) {
  const group = new THREE.Group();
  const seatH = 0.04;
  const seatW = 0.4;
  const seatD = 0.4;
  const legH = 0.45;
  const legW = 0.04;
  const backH = 0.45;

  // Seat
  const seatGeo = new THREE.BoxGeometry(seatW, seatH, seatD);
  const seat = createEdgedMesh(seatGeo);
  seat.position.set(x, floorY + legH + seatH / 2, z);
  group.add(seat);

  // 4 legs
  const legGeo = new THREE.BoxGeometry(legW, legH, legW);
  const offsets = [
    [-seatW / 2 + legW, -seatD / 2 + legW],
    [seatW / 2 - legW, -seatD / 2 + legW],
    [-seatW / 2 + legW, seatD / 2 - legW],
    [seatW / 2 - legW, seatD / 2 - legW],
  ];
  for (const [ox, oz] of offsets) {
    const leg = createEdgedMesh(legGeo);
    leg.position.set(x + ox, floorY + legH / 2, z + oz);
    group.add(leg);
  }

  // Back
  const backGeo = new THREE.BoxGeometry(seatW, backH, legW);
  const back = createEdgedMesh(backGeo);
  back.position.set(x, floorY + legH + seatH + backH / 2, z - seatD / 2 + legW);
  group.add(back);

  group.rotation.y = rotY;
  return group;
}
