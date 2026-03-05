export class AvatarAnimator {
  constructor(avatar) {
    this.avatar = avatar;
    this.walkCycle = 0;
    this.walkSpeed = 0;
    this.targetSpeed = 0;
  }

  update(scrollDelta, delta) {
    this.targetSpeed = Math.abs(scrollDelta) * 800;
    this.walkSpeed += (this.targetSpeed - this.walkSpeed) * Math.min(1, delta * 8);

    if (this.walkSpeed < 0.01) {
      this.walkSpeed = 0;
      this.settleToIdle(delta);
      return;
    }

    this.walkCycle += this.walkSpeed * delta;

    const legSwing = Math.sin(this.walkCycle) * 0.4;
    const armSwing = Math.sin(this.walkCycle) * 0.3;
    const bob = Math.abs(Math.sin(this.walkCycle * 2)) * 0.03;

    // Legs
    this.avatar.leftHip.rotation.x = legSwing;
    this.avatar.rightHip.rotation.x = -legSwing;

    // Knee bend on back-swing
    const leftKneeBend = Math.max(0, -legSwing) * 0.6;
    const rightKneeBend = Math.max(0, legSwing) * 0.6;
    this.avatar.leftKnee.rotation.x = leftKneeBend;
    this.avatar.rightKnee.rotation.x = rightKneeBend;

    // Arms counter-swing
    this.avatar.leftShoulder.rotation.x = -armSwing;
    this.avatar.rightShoulder.rotation.x = armSwing;

    // Slight elbow bend
    this.avatar.leftElbow.rotation.x = Math.abs(armSwing) * 0.3;
    this.avatar.rightElbow.rotation.x = Math.abs(armSwing) * 0.3;

    // Vertical bob
    this.avatar.body.position.y = bob;
  }

  settleToIdle(delta) {
    const ease = Math.min(1, delta * 6);
    this.avatar.leftHip.rotation.x *= 1 - ease;
    this.avatar.rightHip.rotation.x *= 1 - ease;
    this.avatar.leftKnee.rotation.x *= 1 - ease;
    this.avatar.rightKnee.rotation.x *= 1 - ease;
    this.avatar.leftShoulder.rotation.x *= 1 - ease;
    this.avatar.rightShoulder.rotation.x *= 1 - ease;
    this.avatar.leftElbow.rotation.x *= 1 - ease;
    this.avatar.rightElbow.rotation.x *= 1 - ease;
    this.avatar.body.position.y *= 1 - ease;
  }
}
