import { PLAYER } from "../../config";
import type { PlayerController, PlayerState, StateName } from "../PlayerController";
import type { InputState } from "../InputBuffer";

export class GroundedState implements PlayerState {
  readonly name: StateName = "Grounded";
  constructor(private ctx: PlayerController) {}

  enter(): void {
    // 落地：重置二段跳 / dash / bash
    this.ctx.airDoubleJumpUsed = false;
    this.ctx.airDashUsed = false;
    this.ctx.airBashUsed = false;
    this.ctx.wallSlideFramesLeft = PLAYER.wallSlideMaxFrames;
  }

  update(_dt: number, input: InputState): void {
    this.ctx.applyHorizontalInput(input, PLAYER.runAccel, PLAYER.groundFriction);

    // 跳跃
    if (this.ctx.player.inputBuffer.consumeJump()) {
      this.ctx.doJump(PLAYER.jumpVel, "jump");
      this.ctx.transition("Airborne");
      return;
    }

    // 冲刺
    if (this.ctx.player.inputBuffer.consumeDash()) {
      this.ctx.transition("Dash");
      return;
    }

    // Bash
    if (this.ctx.player.inputBuffer.consumeBash()) {
      if (this.ctx.tryStartBash()) return;
    }

    // 脚下没地了就转空中（落崖）
    if (!this.ctx.body.blocked.down && !this.ctx.body.touching.down) {
      this.ctx.transition("Airborne");
    }
  }

  exit(): void {}
}
