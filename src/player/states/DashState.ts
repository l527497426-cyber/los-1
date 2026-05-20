import { PLAYER } from "../../config";
import type { PlayerController, PlayerState, StateName } from "../PlayerController";
import type { InputState } from "../InputBuffer";

export class DashState implements PlayerState {
  readonly name: StateName = "Dash";
  private framesLeft = 0;
  private dir: -1 | 1 = 1;

  constructor(private ctx: PlayerController) {}

  enter(): void {
    this.framesLeft = PLAYER.dashFrames;
    this.dir = this.ctx.player.facing;
    this.ctx.body.velocity.y = 0;
    this.ctx.body.velocity.x = this.dir * PLAYER.dashSpeed;
    this.ctx.airDashUsed = true;
  }

  update(_dt: number, _input: InputState): void {
    this.framesLeft--;
    this.ctx.body.velocity.y = 0;                      // dash 期间无重力
    this.ctx.body.velocity.x = this.dir * PLAYER.dashSpeed;

    // 触墙：立即转 Airborne，保留少量横向速度
    const stoppedByWall =
      (this.dir === 1 && (this.ctx.body.blocked.right || this.ctx.body.touching.right)) ||
      (this.dir === -1 && (this.ctx.body.blocked.left || this.ctx.body.touching.left));
    if (stoppedByWall) {
      this.framesLeft = 0;
    }

    if (this.framesLeft <= 0) {
      if (this.ctx.body.blocked.down || this.ctx.body.touching.down) {
        this.ctx.transition("Grounded");
      } else {
        this.ctx.transition("Airborne");
      }
    }
  }

  exit(): void {
    // dash 退出时保留一点横向（不全清，feel 更顺）
    this.ctx.body.velocity.x = this.dir * Math.min(Math.abs(this.ctx.body.velocity.x), PLAYER.runMax);
  }
}
