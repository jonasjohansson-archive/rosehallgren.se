import * as THREE from 'three';
import {
  floorMaterial,
  ceilingMaterial,
} from '../materials/InteriorMaterials.js';
import { createGalleryImages } from './GalleryWalls.js';
import { createFurniture } from './FurnitureGenerator.js';
import { createEdgedMesh } from '../materials/createEdgedMesh.js';

const WALL_INSET = 0.25;
const loader = new THREE.TextureLoader();

export class InteriorGenerator {
  constructor() {
    this.cache = new Map();
  }

  generate(house, project) {
    const key = project.id;
    if (this.cache.has(key)) return this.cache.get(key);

    const config = project.house;
    const { width, depth, floors, floorHeight } = config;
    const innerW = width - WALL_INSET * 2;
    const innerD = depth - WALL_INSET * 2;

    const interior = new THREE.Group();
    interior.name = 'interior-' + key;

    const colliders = [];

    // Distribute images across walls: back, left, right, front
    const images = project.images;

    for (let f = 0; f < floors; f++) {
      const floorY = f * floorHeight + 0.15;
      const floorGroup = new THREE.Group();

      // Floor
      const floorGeo = new THREE.PlaneGeometry(innerW, innerD);
      const floor = new THREE.Mesh(floorGeo, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = floorY + 0.01;
      floorGroup.add(floor);

      // Ceiling
      const ceilGeo = new THREE.PlaneGeometry(innerW, innerD);
      const ceiling = new THREE.Mesh(ceilGeo, ceilingMaterial);
      ceiling.rotation.x = Math.PI / 2;
      ceiling.position.y = floorY + floorHeight - 0.01;
      floorGroup.add(ceiling);

      // Walls with project images as textures
      const wallH = floorHeight - 0.02;
      const hw = innerW / 2;
      const hd = innerD / 2;

      // Pick images for each wall on this floor
      const floorImgStart = f * 4;
      const backImg = images[(floorImgStart + 0) % images.length];
      const leftImg = images[(floorImgStart + 1) % images.length];
      const rightImg = images[(floorImgStart + 2) % images.length];
      const frontImg = images.length > 3 ? images[(floorImgStart + 3) % images.length] : null;

      // Back wall — image textured
      const backWall = createTexturedWall(innerW, wallH, backImg);
      backWall.position.set(0, floorY + wallH / 2, -hd);
      floorGroup.add(backWall);
      colliders.push(backWall);

      // Left wall — image textured
      const leftWall = createTexturedWall(innerD, wallH, leftImg);
      leftWall.position.set(-hw, floorY + wallH / 2, 0);
      leftWall.rotation.y = Math.PI / 2;
      floorGroup.add(leftWall);
      colliders.push(leftWall);

      // Right wall — image textured
      const rightWall = createTexturedWall(innerD, wallH, rightImg);
      rightWall.position.set(hw, floorY + wallH / 2, 0);
      rightWall.rotation.y = -Math.PI / 2;
      floorGroup.add(rightWall);
      colliders.push(rightWall);

      // Front wall — plain warm color (has door opening)
      const frontMat = new THREE.MeshStandardMaterial({
        color: 0xf5f0eb,
        roughness: 0.8,
        side: THREE.DoubleSide,
      });
      const frontGeo = new THREE.PlaneGeometry(innerW, wallH);
      const frontWall = new THREE.Mesh(frontGeo, frontMat);
      frontWall.position.set(0, floorY + wallH / 2, hd);
      frontWall.rotation.y = Math.PI;
      floorGroup.add(frontWall);
      colliders.push(frontWall);

      // Gallery framed images on walls (additional detail)
      const galleryStart = f * Math.ceil(images.length / floors);
      const galleryImages = images.slice(galleryStart, galleryStart + Math.ceil(images.length / floors));
      if (galleryImages.length > 0) {
        const gallery = createGalleryImages(galleryImages, innerW, wallH, floorY);
        floorGroup.add(gallery);
      }

      // Furniture
      const furniture = createFurniture(innerW, innerD, floorY);
      floorGroup.add(furniture);

      // Lighting
      const pointLight = new THREE.PointLight(0xfff4e0, 1.5, innerW * 2);
      pointLight.position.set(0, floorY + floorHeight - 0.3, 0);
      floorGroup.add(pointLight);

      // Staircase for multi-floor (not on top floor)
      if (floors > 1 && f < floors - 1) {
        const stairs = createStaircase(innerW, floorHeight, floorY);
        floorGroup.add(stairs);
      }

      interior.add(floorGroup);
    }

    // Ambient light for interior
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    interior.add(ambient);

    const result = { group: interior, colliders };
    this.cache.set(key, result);
    return result;
  }

  dispose(projectId) {
    const cached = this.cache.get(projectId);
    if (!cached) return;

    cached.group.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        if (child.material.map) child.material.map.dispose();
        if (!child.material._shared) child.material.dispose();
      }
    });

    if (cached.group.parent) {
      cached.group.parent.remove(cached.group);
    }

    this.cache.delete(projectId);
  }
}

function createTexturedWall(wallW, wallH, imageUrl) {
  const tex = loader.load(imageUrl);
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.7,
    side: THREE.DoubleSide,
  });

  const geo = new THREE.PlaneGeometry(wallW, wallH);
  const mesh = new THREE.Mesh(geo, mat);
  return mesh;
}

function createStaircase(roomWidth, floorHeight, floorY) {
  const group = new THREE.Group();
  const steps = 12;
  const stepH = floorHeight / steps;
  const stepW = 0.8;
  const stepD = 0.3;

  const startX = -roomWidth / 2 + 0.6;
  const startZ = 0;

  for (let i = 0; i < steps; i++) {
    const geo = new THREE.BoxGeometry(stepW, stepH, stepD);
    const step = createEdgedMesh(geo);
    step.position.set(
      startX,
      floorY + stepH / 2 + i * stepH,
      startZ + i * stepD
    );
    group.add(step);
  }

  return group;
}
