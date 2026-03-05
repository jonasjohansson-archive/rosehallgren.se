import * as THREE from 'three';

const _worldPos = new THREE.Vector3();

export class BuildAnimation {
  constructor() {
    this.houses = new Map();
    this.revealed = new Set();
  }

  register(house) {
    const parts = house.userData.constructionParts;
    if (!parts) return;

    // Get each part's Y position for sorting (bottom-up like a card house)
    const partsWithY = parts.map((obj) => {
      // Get the world-space Y of each part
      obj.updateWorldMatrix(true, false);
      obj.getWorldPosition(_worldPos);
      return { object: obj, sortY: _worldPos.y };
    });

    // Sort by Y position — bottom pieces first
    partsWithY.sort((a, b) => a.sortY - b.sortY);

    const animParts = partsWithY.map((entry, i) => {
      const obj = entry.object;
      obj.visible = false;

      // Store the original local Y so we can animate from below
      const finalY = obj.position.y;

      return {
        object: obj,
        finalY,
        startTime: 0,
        duration: 0.35,
        delay: i * 0.12, // tighter stagger for card-house feel
        started: false,
      };
    });

    this.houses.set(house, animParts);
  }

  update(cameraZ, _delta, elapsed) {
    for (const [house, parts] of this.houses) {
      if (this.revealed.has(house)) continue;

      const houseZ = house.getWorldPosition(_worldPos).z;
      const distance = Math.abs(cameraZ - houseZ);

      if (distance < 25) {
        let allDone = true;
        let triggerTime = parts[0]._triggerTime;

        if (triggerTime === undefined) {
          triggerTime = elapsed;
          parts[0]._triggerTime = triggerTime;
        }

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];

          if (!part.started) {
            part.startTime = triggerTime + part.delay;
            part.started = true;
            // Start piece below its final position
            part.object.position.y = part.finalY - 0.5;
            part.object.scale.set(1, 0, 1);
          }

          const timeSinceStart = elapsed - part.startTime;

          if (timeSinceStart < 0) {
            allDone = false;
            continue;
          }

          part.object.visible = true;
          const t = Math.min(1, timeSinceStart / part.duration);

          if (t < 1) {
            allDone = false;
          }

          // Ease-out back — slight overshoot for a "snap into place" feel
          const eased = 1 - Math.pow(1 - t, 3);
          // Slight bounce at the end
          const bounce = t < 0.8 ? eased : 1 + Math.sin((t - 0.8) * Math.PI / 0.2) * 0.02;

          part.object.scale.set(1, eased, 1);
          // Slide up from below to final position
          part.object.position.y = part.finalY - 0.5 * (1 - eased);
        }

        if (allDone) {
          this.revealed.add(house);
          for (const part of parts) {
            part.object.scale.set(1, 1, 1);
            part.object.position.y = part.finalY;
          }
        }
      }
    }
  }
}
