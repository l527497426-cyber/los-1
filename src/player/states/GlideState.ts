import { PHYSICS, PLAYER } from "../../config";
import type { PlayerController, PlayerState, StateName } from "../PlayerController";
import type { InputState } from "../InputBuffer";

export class GlideState implements PlayerState {
  readonly name: StateName = "Glide";
  constructor(private ctx: PlayerController) {}

  enter(): void {}

  update(_dt: number, input: InputState): void {
    this.ctx.applyHorizontalInput(input, PLAYER.airAccel * 0.7, PLAYER.airFriction);
    this.ctx.applyGravity(PHYSICS.glideGravityMul);

    // 二段跳允许从滑翔中触发
    if (this.ctx.player.inputBuffer.consumeJump() && !this.ctx.airDoubleJumpUsed) {
      this.ctx.airDoubleJumpUsed = true;
      this.ctx.doJump(PLAYER.doubleJumpVel, "doubleJump");
      this.ctx.transition("Airborne");
      return;
    }

    // Dash 中断
    if (this.ctx.player.inputBuffer.consumeDash() && !this.ctx.airDashUsed) {
      this.ctx.transition("Dash");
      return;
    }

    // Bash 中断
    if (this.ctx.player.inputBuffer.consumeBash()) {
      if (this.ctx.tryStartBash()) return;
    }

    // 放开 down → 退出
    if (!input.downHeld) {
      this.ctx.transition("Airborne");
      return;
    }

    if (this.ctx.body.blocked.down || this.ctx.body.touching.down) {
      this.ctx.transition("Grounded");
    }
  }

  exit(): void {}
}
