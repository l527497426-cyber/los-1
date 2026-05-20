import { PLAYER } from "../../config";
import type { PlayerController, PlayerState, StateName } from "../PlayerController";
import type { InputState } from "../InputBuffer";

export class AirborneState implements PlayerState {
  readonly name: StateName = "Airborne";
  constructor(private ctx: PlayerController) {}

  enter(): void {}

  update(_dt: number, input: InputState): void {
    this.ctx.applyHorizontalInput(input, PLAYER.airAccel, PLAYER.airFriction);

    // 可变跳跃高度：起跳后若 jumpHeld 提前释放，纵向速度立刻打折
    if (
      this.ctx.variableJumpFramesLeft > 0 &&
      !input.jumpHeld &&
      this.ctx.body.velocity.y < 0
    ) {
      this.ctx.body.velocity.y *= PLAYER.variableJumpCutMul;
      this.ctx.variableJumpFramesLeft = 0;
    }

    this.ctx.applyGravity();

    // 跳跃：墙 coyote 优先 → 普通 coyote → 二段跳
    if (this.ctx.player.inputBuffer.consumeJump()) {
      if (input.wallCoyoteLeft > 0 && input.wallCoyoteSide !== 0) {
        // 墙跳（grace）
        this.ctx.body.velocity.x = -input.wallCoyoteSide * PLAYER.wallJumpVelX;
        this.ctx.doJump(PLAYER.wallJumpVelY, "wallJump");
        this.ctx.wallJumpLockLeft = PLAYER.wallJumpLockFrames;
        input.wallCoyoteLeft = 0;
        input.wallCoyoteSide = 0;
        this.ctx.player.setFacing(-input.wallCoyoteSide === 1 ? 1 : -1);
        return;
      }
      if (input.coyoteLeft > 0) {
        this.ctx.doJump(PLAYER.jumpVel, "jump");
        input.coyoteLeft = 0;
        return;
      }
      if (!this.ctx.airDoubleJumpUsed) {
        this.ctx.airDoubleJumpUsed = true;
        this.ctx.doJump(PLAYER.doubleJumpVel, "doubleJump");
        return;
      }
    }

    // Dash
    if (this.ctx.player.inputBuffer.consumeDash() && !this.ctx.airDashUsed) {
      this.ctx.transition("Dash");
      return;
    }

    // Bash
    if (this.ctx.player.inputBuffer.consumeBash()) {
      if (this.ctx.tryStartBash()) return;
    }

    // 抓墙：贴墙 + 朝那个方向按 + 在下落
    const onWallL = (this.ctx.body.blocked.left || this.ctx.body.touching.left) && input.leftHeld;
    const onWallR = (this.ctx.body.blocked.right || this.ctx.body.touching.right) && input.rightHeld;
    if ((onWallL || onWallR) && this.ctx.body.velocity.y > 0) {
      this.ctx.transition("WallSlide");
      return;
    }

    // 滑翔：在空中且持续按下 + 正在下落
    if (
      input.downHeld &&
      this.ctx.body.velocity.y > 0 &&
      this.ctx.airFramesSinceLeftGround > PLAYER.glideEngageFrames
    ) {
      this.ctx.transition("Glide");
      return;
    }

    // 落地
    if (this.ctx.body.blocked.down || this.ctx.body.touching.down) {
      this.ctx.transition("Grounded");
    }
  }

  exit(): void {}
}
