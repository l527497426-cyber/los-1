import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config";
import { touchState } from "./touchState";

// 在 HudScene 之上叠加的虚拟摇杆 + 按钮。
// 用 Phaser 多指针 + 自己跟踪每个 pointerId 的归属。

interface Button {
  kind: "jump" | "dash" | "bash";
  cx: number;
  cy: number;
  r: number;
  color: number;
  label: string;
}

export class TouchControls {
  private scene: Phaser.Scene;

  private stickBaseX = 130;
  private stickBaseY = GAME_HEIGHT - 110;
  private stickRadius = 70;
  private stickDeadzone = 14;

  private stickThumbX = this.stickBaseX;
  private stickThumbY = this.stickBaseY;

  private buttons: Button[] = [
    { kind: "jump", cx: GAME_WIDTH - 90, cy: GAME_HEIGHT - 90, r: 46, color: 0xf4b03c, label: "↑" },
    { kind: "dash", cx: GAME_WIDTH - 180, cy: GAME_HEIGHT - 140, r: 36, color: 0x7be0d6, label: "»" },
    { kind: "bash", cx: GAME_WIDTH - 200, cy: GAME_HEIGHT - 50, r: 36, color: 0xc44530, label: "✦" },
  ];

  // pointerId → 控件归属
  private stickPointerId: number | null = null;
  private buttonPointers: Map<number, Button> = new Map();

  // 绘图层
  private gfx: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];

  // 上一帧的"按下"快照，用于生成边沿脉冲
  private lastJumpHeld = false;
  private lastDash = false;
  private lastBash = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    touchState.enabled = true;

    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(200);

    // 按钮文字
    for (const b of this.buttons) {
      const t = scene.add
        .text(b.cx, b.cy, b.label, {
          fontFamily: "Georgia, serif",
          fontSize: b.kind === "jump" ? "32px" : "26px",
          color: "#0b0a14",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(201);
      this.labels.push(t);
    }

    // 确保多指针可用
    if (scene.input.pointer1 == null) {
      scene.input.addPointer(3);
    } else {
      // 一般默认是 1，加到 4 个
      scene.input.addPointer(3);
    }

    scene.input.on("pointerdown", this.onDown, this);
    scene.input.on("pointermove", this.onMove, this);
    scene.input.on("pointerup", this.onUp, this);
    scene.input.on("pointerupoutside", this.onUp, this);
    scene.input.on("pointercancel", this.onUp, this);

    scene.events.once("shutdown", () => this.destroy());
    scene.events.once("destroy", () => this.destroy());

    this.draw();
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    // 摇杆区：屏幕左半 & 下半
    if (pointer.x < GAME_WIDTH / 2) {
      if (this.stickPointerId === null) {
        this.stickPointerId = pointer.id;
        this.stickBaseX = pointer.x;
        this.stickBaseY = pointer.y;
        this.stickThumbX = pointer.x;
        this.stickThumbY = pointer.y;
        this.updateStickState();
        this.draw();
        return;
      }
    }
    // 按钮命中
    for (const b of this.buttons) {
      const dx = pointer.x - b.cx;
      const dy = pointer.y - b.cy;
      if (dx * dx + dy * dy <= b.r * b.r) {
        this.buttonPointers.set(pointer.id, b);
        this.applyButtonsDown();
        this.draw();
        return;
      }
    }
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.stickPointerId) {
      this.stickThumbX = pointer.x;
      this.stickThumbY = pointer.y;
      this.updateStickState();
      this.draw();
    }
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.stickPointerId) {
      this.stickPointerId = null;
      this.stickThumbX = this.stickBaseX;
      this.stickThumbY = this.stickBaseY;
      touchState.left = false;
      touchState.right = false;
      touchState.down = false;
      this.draw();
    }
    if (this.buttonPointers.has(pointer.id)) {
      this.buttonPointers.delete(pointer.id);
      this.applyButtonsDown();
      this.draw();
    }
  }

  // 把当前按下的按钮聚合成状态 + 触发"刚按下"脉冲
  private applyButtonsDown(): void {
    let jump = false;
    let dash = false;
    let bash = false;
    for (const b of this.buttonPointers.values()) {
      if (b.kind === "jump") jump = true;
      if (b.kind === "dash") dash = true;
      if (b.kind === "bash") bash = true;
    }

    if (jump && !this.lastJumpHeld) touchState.jumpPressed = true;
    if (dash && !this.lastDash) touchState.dashPressed = true;
    if (bash && !this.lastBash) touchState.bashPressed = true;

    touchState.jumpHeld = jump;
    this.lastJumpHeld = jump;
    this.lastDash = dash;
    this.lastBash = bash;
  }

  private updateStickState(): void {
    const dx = this.stickThumbX - this.stickBaseX;
    const dy = this.stickThumbY - this.stickBaseY;
    const len = Math.hypot(dx, dy);
    // 限制 thumb 不超过 base radius
    if (len > this.stickRadius) {
      this.stickThumbX = this.stickBaseX + (dx / len) * this.stickRadius;
      this.stickThumbY = this.stickBaseY + (dy / len) * this.stickRadius;
    }
    const ax = this.stickThumbX - this.stickBaseX;
    const ay = this.stickThumbY - this.stickBaseY;
    touchState.left = ax < -this.stickDeadzone;
    touchState.right = ax > this.stickDeadzone;
    touchState.down = ay > this.stickDeadzone;
  }

  private draw(): void {
    this.gfx.clear();

    // 摇杆 base
    this.gfx.lineStyle(2, 0xeae6d5, 0.35);
    this.gfx.strokeCircle(this.stickBaseX, this.stickBaseY, this.stickRadius);
    this.gfx.fillStyle(0xeae6d5, 0.08);
    this.gfx.fillCircle(this.stickBaseX, this.stickBaseY, this.stickRadius);

    // 摇杆 thumb
    const thumbActive = this.stickPointerId !== null;
    this.gfx.fillStyle(0xeae6d5, thumbActive ? 0.6 : 0.25);
    this.gfx.fillCircle(this.stickThumbX, this.stickThumbY, 28);

    // 按钮
    for (const b of this.buttons) {
      const held = Array.from(this.buttonPointers.values()).includes(b);
      this.gfx.fillStyle(b.color, held ? 0.85 : 0.35);
      this.gfx.fillCircle(b.cx, b.cy, b.r);
      this.gfx.lineStyle(2, b.color, 0.9);
      this.gfx.strokeCircle(b.cx, b.cy, b.r);
    }
  }

  destroy(): void {
    this.scene.input.off("pointerdown", this.onDown, this);
    this.scene.input.off("pointermove", this.onMove, this);
    this.scene.input.off("pointerup", this.onUp, this);
    this.scene.input.off("pointerupoutside", this.onUp, this);
    this.scene.input.off("pointercancel", this.onUp, this);
    this.gfx.destroy();
    for (const l of this.labels) l.destroy();
    this.labels = [];
    this.buttonPointers.clear();
    this.stickPointerId = null;
    touchState.enabled = false;
    touchState.left = touchState.right = touchState.down = false;
    touchState.jumpHeld = false;
    touchState.jumpPressed = touchState.dashPressed = touchState.bashPressed = false;
  }
}
