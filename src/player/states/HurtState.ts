import type { PlayerController, PlayerState, StateName } from "../PlayerController";
import type { InputState } from "../InputBuffer";

// 受击锁定：玩家在 N 帧内只受重力影响，无法输入。
export class HurtState implements PlayerState {
  readonly name: StateName = "Hurt";
  private framesLeft = 0;

  constructor(private ctx: PlayerController) {}

  setRemaining(f: number): void {
    this.framesLeft = f;
  }

  enter(): void {}

  update(_dt: number, _input: InputState): void {
    this.framesLeft--;
    this.ctx.applyGravity();
    if (this.framesLeft <= 0) {
      if (this.ctx.body.blocked.down || this.ctx.body.touching.down) {
        this.ctx.transition("Grounded");
      } else {
        this.ctx.transition("Airborne");
      }
    }
  }

  exit(): void {}
}
