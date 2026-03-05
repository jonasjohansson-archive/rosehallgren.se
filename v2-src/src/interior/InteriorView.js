import * as THREE from 'three';
import { InteriorGenerator } from './InteriorGenerator.js';

export class InteriorView {
  constructor(cameraController, scene) {
    this.cameraController = cameraController;
    this.scene = scene;
    this.interiorGen = new InteriorGenerator();
    this.currentProject = null;
    this.currentHouse = null;
    this.currentInterior = null;
    this.currentColliders = null;

  }

  enter(house, project) {
    this.currentProject = project;
    this.currentHouse = house;

    const config = project.house;
    const worldPos = new THREE.Vector3();
    house.getWorldPosition(worldPos);

    // Generate interior (lazy, cached)
    const { group, colliders } = this.interiorGen.generate(house, project);
    this.currentInterior = group;
    this.currentColliders = colliders;

    // Position interior at house world position
    group.position.copy(worldPos);
    group.rotation.y = house.rotation.y;

    // Transform colliders to world space for raycasting
    group.updateMatrixWorld(true);

    this.scene.add(group);

    // Camera enters at door, looks toward back wall
    const interiorY = 1.7;
    const interiorPos = new THREE.Vector3(worldPos.x, interiorY, worldPos.z);

    // Adjust for house rotation: door is on +Z side in local space
    const doorOffset = new THREE.Vector3(0, 0, config.depth * 0.3);
    doorOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), house.rotation.y);
    interiorPos.add(doorOffset);

    const lookAt = new THREE.Vector3(worldPos.x, interiorY, worldPos.z);
    const lookOffset = new THREE.Vector3(0, 0, -config.depth * 0.3);
    lookOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), house.rotation.y);
    lookAt.add(lookOffset);

    this.cameraController.enterHouse(interiorPos, lookAt);
  }

  exit() {
    if (!this.currentProject) return;
    const projectId = this.currentProject.id;
    this.currentProject = null;
    this.currentHouse = null;
    this.currentColliders = null;

    // Remove interior from scene and dispose
    if (this.currentInterior) {
      this.scene.remove(this.currentInterior);
      this.interiorGen.dispose(projectId);
      this.currentInterior = null;
    }

  }

  isActive() {
    return this.currentProject !== null;
  }

  getColliders() {
    return this.currentColliders;
  }
}
