import Phaser from "phaser";
import { PLAYER } from "../../config";
import type { PlayerController, PlayerState, StateName } from "../PlayerController";
import type { InputState } from "../InputBuffer";

type BashTarget = Phaser.GameObjects.GameObject & {
  x: number;
  y: number;
  body?: Phaser.Physics.Arcade.Body | null;
  isAnchor?: boolean;
  onBashed?: () => void;
};

// Bash 流程：
// 1. enter：吸附到目标，物理世界 timeScale ↓，玩家显示瞄准光环
// 2. update：玩家用方向键/WASD 选方向；显示扇形指示
// 3. exit 条件：再次按 Bash / 松开 Bash 键 / 达到 dilation 上限 → 弹射
export class BashState implements PlayerState {
  readonly name: StateName = "Bash";
  private target: BashTarget | null = null;
  private framesLeft = 0;
  private aimDirX = 1;
  private aimDirY = 0;
  private indicator?: Phaser.GameObjects.Graphics;
  private originalTimeScale = 1;

  constructor(private ctx: PlayerController) {}

  setTarget(t: BashTarget): void {
    this.target = t;
  }

  enter(): void {
    if (!this.target) {
      this.ctx.transition("Airborne");
      return;
    }
    this.framesLeft = PLAYER.bashDilationFrames;
    this.ctx.body.velocity.set(0, 0);
    // 吸附（少量偏移避免穿模）
    this.ctx.player.x = this.target.x;
    this.ctx.player.y = this.target.y;

    // 时间膨胀（仅物理）
    this.originalTimeScale = this.ctx.player.scene.physics.world.timeScale;
    this.ctx.player.scene.physics.world.timeScale = 4; // 物理快 4 倍 == 感官慢 4 倍
    this.ctx.player.scene.time.timeScale = 0.25;        // tween 同步慢

    this.indicator = this.ctx.player.scene.add.graphics();
    this.indicator.setDepth(50);

    // 初始瞄准方向 = 玩家朝向 + 上方
    this.aimDirX = this.ctx.player.facing;
    this.aimDirY = -0.6;
    this.normalizeAim();
    this.ctx.airBashUsed = true;
  }

  update(_dt: number, input: InputState): void {
    if (!this.target) {
      this.ctx.transition("Airborne");
      return;
    }
    this.framesLeft--;

    // 由玩家方向键设置瞄准（每帧覆盖）
    let ax = 0;
    let ay = 0;
    if (input.leftHeld) ax -= 1;
    if (input.rightHeld) ax += 1;
    if (input.jumpHeld) ay -= 1;
    if (input.downHeld) ay += 1;
    if (ax !== 0 || ay !== 0) {
      this.aimDirX = ax;
      this.aimDirY = ay;
      this.normalizeAim();
    }

    // 把玩家持续粘在目标上
    this.ctx.player.x = this.target.x;
    this.ctx.player.y = this.target.y;
    this.ctx.body.velocity.set(0, 0);

    // 绘制指示线（指向弹射方向）
    if (this.indicator) {
      this.indicator.clear();
      this.indicator.lineStyle(3, 0x7be0d6, 0.9);
      this.indicator.beginPath();
      this.indicator.moveTo(this.ctx.player.x, this.ctx.player.y);
      this.indicator.lineTo(
        this.ctx.player.x + this.aimDirX * PLAYER.bashMaxAimRadius,
        this.ctx.player.y + this.aimDirY * PLAYER.bashMaxAimRadius,
      );
      this.indicator.strokePath();
      this.indicator.fillStyle(0x7be0d6, 0.5);
      this.indicator.fillCircle(this.ctx.player.x, this.ctx.player.y, 14);
    }

    // 弹射触发：再次按 Bash 立即发射，或瞄准窗口耗尽自动发射
    if (this.framesLeft <= 0 || this.ctx.player.inputBuffer.consumeBash()) {
      this.eject();
    }
  }

  private normalizeAim(): void {
    const len = Math.hypot(this.aimDirX, this.aimDirY);
    if (len > 0.0001) {
      this.aimDirX /= len;
      this.aimDirY /= len;
    } else {
      this.aimDirX = this.ctx.player.facing;
      this.aimDirY = 0;
    }
  }

  private eject(): void {
    if (!this.target) {
      this.cleanup();
      this.ctx.transition("Airborne");
      return;
    }
    const tx = this.target.x;
    const ty = this.target.y;
    const isAnchor = this.target.isAnchor === true;
    const onBashed = this.target.onBashed;
    this.ctx.body.velocity.x = this.aimDirX * PLAYER.bashPlayerEject;
    this.ctx.body.velocity.y = this.aimDirY * PLAYER.bashPlayerEject;
    // 反向给目标速度（敌人会被弹飞；锚点固定不动）
    const tBody = this.target.body;
    if (!isAnchor && tBody && "velocity" in tBody) {
      tBody.velocity.x = -this.aimDirX * PLAYER.bashTargetEject;
      tBody.velocity.y = -this.aimDirY * PLAYER.bashTargetEject;
    }
    this.cleanup();                       // 先恢复 timeScale，再发命中特效（避免与顿帧冲突）
    this.ctx.player.grantBashGrace(10);   // 弹开瞬间不被原目标蹭伤
    this.ctx.player.scene.events.emit("fx:bashImpact", { x: tx, y: ty, anchor: isAnchor });
    this.ctx.airDoubleJumpUsed = false;   // Bash 也回血二段跳，feel 更顺
    if (isAnchor) {
      this.ctx.airBashUsed = false;       // 锚点可连续 bash，实现链式穿越
    }
    onBashed?.();                         // 锚点：刷新；敌人：消灭 + 加分
    this.ctx.transition("Airborne");
  }

  private cleanup(): void {
    if (this.indicator) {
      this.indicator.destroy();
      this.indicator = undefined;
    }
    this.ctx.player.scene.physics.world.timeScale = this.originalTimeScale;
    this.ctx.player.scene.time.timeScale = 1;
    this.target = null;
  }

  exit(): void {
    this.cleanup();
  }
}
