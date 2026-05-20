import Phaser from "phaser";

interface JuiceOpts {
  screenShake: boolean;
  reducedMotion: boolean;
}

// 场景级特效助手：粒子、残影、震屏、闪屏、命中顿帧。
// reducedMotion 时跳过所有非必要动效；screenShake 单独 gate 震屏。
export class Juice {
  private ghostFrame = 0;

  constructor(
    private scene: Phaser.Scene,
    private opts: JuiceOpts,
  ) {}

  // 冲刺残影（每 2 帧一张，节流）
  dashGhost(sprite: Phaser.GameObjects.Sprite): void {
    if (this.opts.reducedMotion) return;
    if (++this.ghostFrame % 2 !== 0) return;
    const g = this.scene.add
      .image(sprite.x, sprite.y, sprite.texture.key)
      .setDepth(sprite.depth - 1)
      .setAlpha(0.5)
      .setTint(0x7be0d6)
      .setFlipX(sprite.flipX);
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 180,
      ease: "Quad.easeOut",
      onComplete: () => g.destroy(),
    });
  }

  landPuff(x: number, y: number, vy: number): void {
    if (this.opts.reducedMotion) return;
    const n = Phaser.Math.Clamp(Math.floor(vy / 110), 3, 10);
    this.burst(x, y, 0xcfc3a8, n, 110, 260);
  }

  jumpPuff(x: number, y: number): void {
    if (this.opts.reducedMotion) return;
    this.burst(x, y, 0xcfc3a8, 4, 80, 200);
  }

  bashImpact(x: number, y: number): void {
    this.burst(x, y, 0x7be0d6, 14, 240, 0);
    this.shake(120, 0.008);
    this.flash(60, 180, 224, 214);
  }

  pickupBurst(x: number, y: number, color: number): void {
    if (!this.opts.reducedMotion) this.burst(x, y, color, 8, 150, 0);
    const c = this.scene.add.circle(x, y, 4, color, 1).setDepth(40);
    this.scene.tweens.add({
      targets: c,
      scale: 2.5,
      alpha: 0,
      duration: 280,
      ease: "Quad.easeOut",
      onComplete: () => c.destroy(),
    });
  }

  // 命中顿帧：真实时冻结物理一小段（不受 timeScale 影响）。
  hitstop(ms: number): void {
    if (this.opts.reducedMotion) return;
    const world = this.scene.physics.world;
    if (world.isPaused) return;
    world.pause();
    window.setTimeout(() => {
      if (this.scene.scene.isActive()) world.resume();
    }, ms);
  }

  shake(duration: number, amplitude: number): void {
    if (this.opts.reducedMotion || !this.opts.screenShake) return;
    this.scene.cameras.main.shake(duration, amplitude);
  }

  flash(duration: number, r: number, g: number, b: number): void {
    if (this.opts.reducedMotion) return;
    this.scene.cameras.main.flash(duration, r, g, b);
  }

  private burst(
    x: number,
    y: number,
    color: number,
    count: number,
    speed: number,
    gravityY: number,
  ): void {
    const em = this.scene.add.particles(x, y, "px", {
      lifespan: 360,
      speed: { min: speed * 0.4, max: speed },
      angle: { min: 0, max: 360 },
      scale: { start: 3, end: 0 },
      gravityY,
      tint: color,
      blendMode: "ADD",
      emitting: false,
    });
    em.setDepth(38);
    em.explode(count, x, y);
    this.scene.time.delayedCall(420, () => em.destroy());
  }
}
