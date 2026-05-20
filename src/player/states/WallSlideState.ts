import { PHYSICS, PLAYER } from "../../config";
import type { PlayerController, PlayerState, StateName } from "../PlayerController";
import type { InputState } from "../InputBuffer";

export class WallSlideState implements PlayerState {
  readonly name: StateName = "WallSlide";
  private side: -1 | 1 = 1;       // 墙在玩家哪侧（1 = 右）

  constructor(private ctx: PlayerController) {}

  enter(): void {
    const onLeft = this.ctx.body.blocked.left || this.ctx.body.touching.left;
    this.side = onLeft ? -1 : 1;
    this.ctx.player.setFacing(this.side);
    this.ctx.wallSlideFramesLeft = PLAYER.wallSlideMaxFrames;
    // 落地落到墙再起跳时刷新二段跳
    this.ctx.airDoubleJumpUsed = false;
    this.ctx.airDashUsed = false;
    this.ctx.airBashUsed = false;
  }

  update(_dt: number, input: InputState): void {
    // 重力打折
    const dt = this.ctx.player.scene.game.loop.delta / 1000;
    this.ctx.body.velocity.y += PHYSICS.gravity * PLAYER.wallSlideGravityMul * dt;
    if (this.ctx.body.velocity.y > PLAYER.wallSlideMaxFall) {
      this.ctx.body.velocity.y = PLAYER.wallSlideMaxFall;
    }
    // 横向贴墙
    this.ctx.body.velocity.x = this.side * 40;

    this.ctx.wallSlideFramesLeft--;
    if (this.ctx.wallSlideFramesLeft <= 0) {
      this.ctx.transition("Airborne");
      return;
    }

    // 墙跳
    if (this.ctx.player.inputBuffer.consumeJump()) {
      this.ctx.body.velocity.x = -this.side * PLAYER.wallJumpVelX;
      this.ctx.doJump(PLAYER.wallJumpVelY, "wallJump");
      this.ctx.wallJumpLockLeft = PLAYER.wallJumpLockFrames;
      this.ctx.player.setFacing(-this.side === 1 ? 1 : -1);
      this.ctx.transition("Airborne");
      return;
    }

    // Dash 中断
    if (this.ctx.player.inputBuffer.consumeDash()) {
      this.ctx.transition("Dash");
      return;
    }

    // 离墙：玩家按反向 / 不再贴墙 / 落地
    const stillOnWall = this.side === -1
      ? this.ctx.body.blocked.left || this.ctx.body.touching.left
      : this.ctx.body.blocked.right || this.ctx.body.touching.right;
    if (!stillOnWall) {
      this.ctx.transition("Airborne");
      return;
    }
    if (this.side === -1 && input.rightHeld) {
      this.ctx.transition("Airborne");
      return;
    }
    if (this.side === 1 && input.leftHeld) {
      this.ctx.transition("Airborne");
      return;
    }
    if (this.ctx.body.blocked.down || this.ctx.body.touching.down) {
      this.ctx.transition("Grounded");
    }
  }

  exit(): void {}
}
