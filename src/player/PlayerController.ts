import Phaser from "phaser";
import { PLAYER, PHYSICS } from "../config";
import type { Player } from "./Player";
import type { InputState } from "./InputBuffer";
import { GroundedState } from "./states/GroundedState";
import { AirborneState } from "./states/AirborneState";
import { WallSlideState } from "./states/WallSlideState";
import { DashState } from "./states/DashState";
import { GlideState } from "./states/GlideState";
import { BashState } from "./states/BashState";
import { HurtState } from "./states/HurtState";

export type StateName = "Grounded" | "Airborne" | "WallSlide" | "Dash" | "Glide" | "Bash" | "Hurt";

export interface PlayerState {
  name: StateName;
  enter(prev: StateName | null): void;
  update(dtMs: number, input: InputState): void;
  exit(next: StateName): void;
}

export class PlayerController {
  public readonly player: Player;
  public readonly body: Phaser.Physics.Arcade.Body;
  public current: PlayerState;

  // 跨状态共享的标记
  public airDoubleJumpUsed = false;
  public airDashUsed = false;
  public airBashUsed = false;
  public wallJumpLockLeft = 0;     // 横向锁定剩余帧
  public wallSlideFramesLeft = PLAYER.wallSlideMaxFrames;
  public variableJumpFramesLeft = 0;
  public airFramesSinceLeftGround = 0;

  // 当前状态名（暴露给 debug overlay）
  public stateName: StateName = "Airborne";

  private states: Record<StateName, PlayerState>;

  constructor(player: Player) {
    this.player = player;
    this.body = player.body as Phaser.Physics.Arcade.Body;

    this.states = {
      Grounded: new GroundedState(this),
      Airborne: new AirborneState(this),
      WallSlide: new WallSlideState(this),
      Dash: new DashState(this),
      Glide: new GlideState(this),
      Bash: new BashState(this),
      Hurt: new HurtState(this),
    };

    this.current = this.states.Airborne;
    this.current.enter(null);
  }

  transition(next: StateName): void {
    if (next === this.stateName) return;
    this.current.exit(next);
    const prev = this.stateName;
    this.stateName = next;
    this.current = this.states[next];
    this.current.enter(prev);
  }

  update(deltaMs: number): void {
    this.player.inputBuffer.poll();
    this.current.update(deltaMs, this.player.inputBuffer.state);

    // 地面 / 墙体感知由 Arcade 物理在碰撞解算后写入 body.blocked.*
    // 这里维护 coyote / wall coyote
    const input = this.player.inputBuffer.state;
    const onGround = this.body.blocked.down || this.body.touching.down;
    const onWallL = this.body.blocked.left || this.body.touching.left;
    const onWallR = this.body.blocked.right || this.body.touching.right;

    if (onGround) {
      input.coyoteLeft = PLAYER.coyoteFrames;
      this.airFramesSinceLeftGround = 0;
    } else {
      this.airFramesSinceLeftGround++;
    }

    if (onWallL || onWallR) {
      input.wallCoyoteLeft = PLAYER.wallJumpGraceFrames;
      input.wallCoyoteSide = onWallL ? -1 : 1;
    }

    if (this.wallJumpLockLeft > 0) this.wallJumpLockLeft--;
    if (this.variableJumpFramesLeft > 0) this.variableJumpFramesLeft--;

    this.player.inputBuffer.decay();
  }

  // 通用：根据输入对 vx 做加速/减速（地面或空中）
  applyHorizontalInput(input: InputState, accel: number, friction: number): void {
    if (this.wallJumpLockLeft > 0) return;
    const wantDir = (input.rightHeld ? 1 : 0) - (input.leftHeld ? 1 : 0);
    if (wantDir !== 0) {
      const dt = this.player.scene.game.loop.delta / 1000;
      this.body.velocity.x += wantDir * accel * dt;
      this.body.velocity.x = Phaser.Math.Clamp(this.body.velocity.x, -PLAYER.runMax, PLAYER.runMax);
      this.player.setFacing(wantDir === 1 ? 1 : -1);
    } else {
      const dt = this.player.scene.game.loop.delta / 1000;
      const v = this.body.velocity.x;
      if (Math.abs(v) <= friction * dt) {
        this.body.velocity.x = 0;
      } else {
        this.body.velocity.x = v - Math.sign(v) * friction * dt;
      }
    }
  }

  applyGravity(mul = 1): void {
    const dt = this.player.scene.game.loop.delta / 1000;
    this.body.velocity.y += PHYSICS.gravity * mul * dt;
    const cap = mul < 1 ? PHYSICS.glideMaxFallSpeed : PHYSICS.maxFallSpeed;
    if (this.body.velocity.y > cap) this.body.velocity.y = cap;
  }

  // 触发跳跃（普通 / 二段 / 墙跳由调用方判断）
  doJump(vy: number): void {
    this.body.velocity.y = vy;
    this.variableJumpFramesLeft = PLAYER.variableJumpWindowFrames;
  }

  forceHurt(frames: number): void {
    this.transition("Hurt");
    (this.states.Hurt as HurtState).setRemaining(frames);
  }

  // Bash 调用端
  tryStartBash(): boolean {
    const candidates = this.player.bashCandidates;
    if (candidates.length === 0) return false;
    if (this.airBashUsed) return false;
    // 取最近
    let nearest = candidates[0]!;
    let best = Infinity;
    for (const c of candidates) {
      const dx = c.obj.x - this.player.x;
      const dy = c.obj.y - this.player.y;
      const d = dx * dx + dy * dy;
      if (d < best) {
        best = d;
        nearest = c;
      }
    }
    if (best > PLAYER.bashRange * PLAYER.bashRange) return false;
    (this.states.Bash as BashState).setTarget(nearest.obj);
    this.transition("Bash");
    return true;
  }
}
