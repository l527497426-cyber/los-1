import Phaser from "phaser";
import { PLAYER } from "../config";
import { InputBuffer } from "./InputBuffer";
import { PlayerController } from "./PlayerController";

export class Player extends Phaser.Physics.Arcade.Sprite {
  public inputBuffer: InputBuffer;
  public controller: PlayerController;
  public hp: number = PLAYER.maxHp;
  public iframesLeft: number = 0;
  public bashGraceLeft: number = 0;     // Bash 弹射后的短暂免伤，防止刚弹开就被原目标蹭到
  public alive: boolean = true;
  public facing: 1 | -1 = 1;
  public hasDoubleJump: boolean = true;
  public hasDash: boolean = true;
  public hasBash: boolean = true;

  // 当前可 Bash 目标缓存（每帧 RunScene 喂）
  public bashCandidates: {
    obj: Phaser.GameObjects.GameObject & {
      x: number;
      y: number;
      body?: Phaser.Physics.Arcade.Body | null;
      isAnchor?: boolean;
      onBashed?: () => void;
    };
  }[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "player");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(PLAYER.width - 2, PLAYER.height - 2);
    body.setOffset(1, 1);
    body.setCollideWorldBounds(false);
    body.setMaxVelocity(800, 1400);

    this.setDepth(20);

    this.inputBuffer = new InputBuffer(scene);
    this.controller = new PlayerController(this);
  }

  override update(_time: number, delta: number): void {
    if (!this.alive) return;
    this.controller.update(delta);

    if (this.bashGraceLeft > 0) this.bashGraceLeft--;

    if (this.iframesLeft > 0) {
      this.iframesLeft--;
      this.setAlpha(this.iframesLeft % 6 < 3 ? 0.3 : 1);
      if (this.iframesLeft === 0) this.setAlpha(1);
    }
  }

  grantBashGrace(frames: number): void {
    this.bashGraceLeft = frames;
  }

  takeHit(fromX: number): boolean {
    if (!this.alive) return false;
    if (this.bashGraceLeft > 0) return false;
    if (this.iframesLeft > 0) return false;
    this.hp -= 1;
    this.iframesLeft = PLAYER.iframeFrames;
    const dir = this.x < fromX ? -1 : 1;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(dir * PLAYER.hurtKnockbackX, PLAYER.hurtKnockbackY);
    this.controller.forceHurt(PLAYER.hurtLockFrames);
    if (this.hp <= 0) {
      this.alive = false;
    }
    return true;
  }

  heal(amount = 1): void {
    this.hp = Math.min(PLAYER.maxHp, this.hp + amount);
  }

  setFacing(dir: 1 | -1): void {
    this.facing = dir;
    this.setFlipX(dir === -1);
  }
}
