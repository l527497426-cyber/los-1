import Phaser from "phaser";
import { PLAYER } from "../config";
import { touchState } from "../ui/touchState";

// 所有按键的状态都在这里。Controller 只读这个。
// 每帧从 cursor / WASD / 自定义键采样。
export interface InputState {
  // 当前按住
  leftHeld: boolean;
  rightHeld: boolean;
  downHeld: boolean;
  jumpHeld: boolean;

  // 这一帧是否刚按下（消费式）
  jumpPressedThisFrame: boolean;
  dashPressedThisFrame: boolean;
  bashPressedThisFrame: boolean;

  // 缓冲剩余帧
  jumpBufferLeft: number;
  dashBufferLeft: number;

  // 上一次脚下/墙边离地后的剩余 coyote 帧
  coyoteLeft: number;
  wallCoyoteLeft: number;
  wallCoyoteSide: -1 | 0 | 1;
}

export class InputBuffer {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA: Phaser.Input.Keyboard.Key;
  private keyD: Phaser.Input.Keyboard.Key;
  private keyW: Phaser.Input.Keyboard.Key;
  private keyS: Phaser.Input.Keyboard.Key;
  private keyShift: Phaser.Input.Keyboard.Key;
  private keyJump: Phaser.Input.Keyboard.Key;       // SPACE
  private keyBashX: Phaser.Input.Keyboard.Key;
  private keyBashJ: Phaser.Input.Keyboard.Key;

  public state: InputState = {
    leftHeld: false,
    rightHeld: false,
    downHeld: false,
    jumpHeld: false,
    jumpPressedThisFrame: false,
    dashPressedThisFrame: false,
    bashPressedThisFrame: false,
    jumpBufferLeft: 0,
    dashBufferLeft: 0,
    coyoteLeft: 0,
    wallCoyoteLeft: 0,
    wallCoyoteSide: 0,
  };

  // 上一帧按键，做边沿检测
  private prevJump = false;
  private prevDash = false;
  private prevBash = false;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyShift = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.keyJump = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyBashX = kb.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.keyBashJ = kb.addKey(Phaser.Input.Keyboard.KeyCodes.J);
  }

  // 每帧 controller.update 开头调用
  poll(): void {
    const s = this.state;

    s.leftHeld = this.cursors.left.isDown || this.keyA.isDown || touchState.left;
    s.rightHeld = this.cursors.right.isDown || this.keyD.isDown || touchState.right;
    s.downHeld = this.cursors.down.isDown || this.keyS.isDown || touchState.down;

    const jumpNow =
      this.cursors.up.isDown || this.keyW.isDown || this.keyJump.isDown || touchState.jumpHeld;
    const dashNow = this.keyShift.isDown;
    const bashNow = this.keyBashX.isDown || this.keyBashJ.isDown;

    // 触屏的脉冲（一次性）
    const dashPulseFromTouch = touchState.dashPressed;
    const bashPulseFromTouch = touchState.bashPressed;
    const jumpPulseFromTouch = touchState.jumpPressed;
    touchState.jumpPressed = false;
    touchState.dashPressed = false;
    touchState.bashPressed = false;

    s.jumpHeld = jumpNow;
    s.jumpPressedThisFrame = (jumpNow && !this.prevJump) || jumpPulseFromTouch;
    s.dashPressedThisFrame = (dashNow && !this.prevDash) || dashPulseFromTouch;
    s.bashPressedThisFrame = (bashNow && !this.prevBash) || bashPulseFromTouch;

    this.prevJump = jumpNow;
    this.prevDash = dashNow;
    this.prevBash = bashNow;

    // 缓冲补充
    if (s.jumpPressedThisFrame) s.jumpBufferLeft = PLAYER.jumpBufferFrames;
    if (s.dashPressedThisFrame) s.dashBufferLeft = PLAYER.dashBufferFrames;
  }

  // 每帧 controller.update 末尾调用
  decay(): void {
    const s = this.state;
    if (s.jumpBufferLeft > 0) s.jumpBufferLeft--;
    if (s.dashBufferLeft > 0) s.dashBufferLeft--;
    if (s.coyoteLeft > 0) s.coyoteLeft--;
    if (s.wallCoyoteLeft > 0) s.wallCoyoteLeft--;
    if (s.wallCoyoteLeft === 0) s.wallCoyoteSide = 0;
  }

  consumeJump(): boolean {
    if (this.state.jumpBufferLeft > 0) {
      this.state.jumpBufferLeft = 0;
      return true;
    }
    return false;
  }

  consumeDash(): boolean {
    if (this.state.dashBufferLeft > 0) {
      this.state.dashBufferLeft = 0;
      return true;
    }
    return false;
  }

  consumeBash(): boolean {
    if (this.state.bashPressedThisFrame) {
      this.state.bashPressedThisFrame = false;
      return true;
    }
    return false;
  }
}
