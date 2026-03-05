import * as THREE from 'three';

const _ray = new THREE.Raycaster();
const _dir = new THREE.Vector3();
const _origin = new THREE.Vector3();
const PLAYER_RADIUS = 0.3;

export class CollisionSystem {
  constructor() {
    this.colliders = [];
  }

  setColliders(meshes) {
    this.colliders = meshes;
  }

  wouldCollide(position, velocity) {
    if (this.colliders.length === 0) return false;
    if (velocity.length() < 0.0001) return false;

    const directions = [];

    // Forward direction
    _dir.copy(velocity).normalize();
    directions.push(_dir.clone());

    // +30° left
    const left = _dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6);
    directions.push(left);

    // -30° right
    const right = _dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 6);
    directions.push(right);

    const castDistance = PLAYER_RADIUS + velocity.length();

    for (const dir of directions) {
      _origin.copy(position);
      _origin.y += 0.5; // cast from waist height

      _ray.set(_origin, dir);
      _ray.far = castDistance;

      const hits = _ray.intersectObjects(this.colliders, false);
      if (hits.length > 0 && hits[0].distance < castDistance) {
        return true;
      }
    }

    return false;
  }
}
