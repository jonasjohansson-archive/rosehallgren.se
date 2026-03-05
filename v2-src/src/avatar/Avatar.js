import * as THREE from 'three';
import { createEdgedMesh } from '../materials/createEdgedMesh.js';

export class Avatar {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'avatar';

    // Body group (everything attached here)
    this.body = new THREE.Group();
    this.root.add(this.body);

    // Head
    this.head = createEdgedMesh(new THREE.BoxGeometry(0.3, 0.3, 0.3));
    this.head.position.y = 1.65;
    this.body.add(this.head);

    // Torso
    this.torso = createEdgedMesh(new THREE.BoxGeometry(0.4, 0.5, 0.2));
    this.torso.position.y = 1.25;
    this.body.add(this.torso);

    // Arms
    this.leftShoulder = new THREE.Group();
    this.leftShoulder.position.set(-0.3, 1.45, 0);
    this.body.add(this.leftShoulder);

    this.leftUpperArm = createEdgedMesh(new THREE.BoxGeometry(0.12, 0.35, 0.12));
    this.leftUpperArm.position.y = -0.175;
    this.leftShoulder.add(this.leftUpperArm);

    this.leftElbow = new THREE.Group();
    this.leftElbow.position.y = -0.35;
    this.leftShoulder.add(this.leftElbow);

    this.leftLowerArm = createEdgedMesh(new THREE.BoxGeometry(0.10, 0.30, 0.10));
    this.leftLowerArm.position.y = -0.15;
    this.leftElbow.add(this.leftLowerArm);

    this.rightShoulder = new THREE.Group();
    this.rightShoulder.position.set(0.3, 1.45, 0);
    this.body.add(this.rightShoulder);

    this.rightUpperArm = createEdgedMesh(new THREE.BoxGeometry(0.12, 0.35, 0.12));
    this.rightUpperArm.position.y = -0.175;
    this.rightShoulder.add(this.rightUpperArm);

    this.rightElbow = new THREE.Group();
    this.rightElbow.position.y = -0.35;
    this.rightShoulder.add(this.rightElbow);

    this.rightLowerArm = createEdgedMesh(new THREE.BoxGeometry(0.10, 0.30, 0.10));
    this.rightLowerArm.position.y = -0.15;
    this.rightElbow.add(this.rightLowerArm);

    // Legs
    this.leftHip = new THREE.Group();
    this.leftHip.position.set(-0.12, 0.95, 0);
    this.body.add(this.leftHip);

    this.leftUpperLeg = createEdgedMesh(new THREE.BoxGeometry(0.14, 0.4, 0.14));
    this.leftUpperLeg.position.y = -0.2;
    this.leftHip.add(this.leftUpperLeg);

    this.leftKnee = new THREE.Group();
    this.leftKnee.position.y = -0.4;
    this.leftHip.add(this.leftKnee);

    this.leftLowerLeg = createEdgedMesh(new THREE.BoxGeometry(0.12, 0.4, 0.12));
    this.leftLowerLeg.position.y = -0.2;
    this.leftKnee.add(this.leftLowerLeg);

    this.leftFoot = createEdgedMesh(new THREE.BoxGeometry(0.14, 0.08, 0.25));
    this.leftFoot.position.set(0, -0.4, 0.05);
    this.leftKnee.add(this.leftFoot);

    this.rightHip = new THREE.Group();
    this.rightHip.position.set(0.12, 0.95, 0);
    this.body.add(this.rightHip);

    this.rightUpperLeg = createEdgedMesh(new THREE.BoxGeometry(0.14, 0.4, 0.14));
    this.rightUpperLeg.position.y = -0.2;
    this.rightHip.add(this.rightUpperLeg);

    this.rightKnee = new THREE.Group();
    this.rightKnee.position.y = -0.4;
    this.rightHip.add(this.rightKnee);

    this.rightLowerLeg = createEdgedMesh(new THREE.BoxGeometry(0.12, 0.4, 0.12));
    this.rightLowerLeg.position.y = -0.2;
    this.rightKnee.add(this.rightLowerLeg);

    this.rightFoot = createEdgedMesh(new THREE.BoxGeometry(0.14, 0.08, 0.25));
    this.rightFoot.position.set(0, -0.4, 0.05);
    this.rightKnee.add(this.rightFoot);
  }

  getGroup() {
    return this.root;
  }

  setVisible(visible) {
    this.root.visible = visible;
  }
}
