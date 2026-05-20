import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, type BiomePalette } from "../config";

function lerpColor(a: number, b: number, t: number): number {
  const ca = Phaser.Display.Color.IntegerToColor(a);
  const cb = Phaser.Display.Color.IntegerToColor(b);
  const r = Math.round(Phaser.Math.Linear(ca.red, cb.red, t));
  const g = Math.round(Phaser.Math.Linear(ca.green, cb.green, t));
  const bl = Math.round(Phaser.Math.Linear(ca.blue, cb.blue, t));
  return (r << 16) | (g << 8) | bl;
}

// D&D 氛围光照：跟随主角的火焰光圈 + 全屏正片叠底染色 + 暗角。
// 暗 biome 里"黑暗中一团火"的地牢/深渊感。
export class Lighting {
  private glow: Phaser.GameObjects.Image;
  private overlay: Phaser.GameObjects.Rectangle;
  private vignette: Phaser.GameObjects.Image;
  private baseGlowScale = 1;
  private overlayColor: number;
  private overlayTargetAlpha: number;

  constructor(
    private scene: Phaser.Scene,
    palette: BiomePalette,
    private reducedMotion: boolean,
    private zoom = 1,
  ) {
    // 正片叠底染色层（在世界之上、特效粒子之下）。
    // 摄像机拉远（zoom<1）时，scrollFactor(0) 层需放大 1/zoom 才能铺满视口。
    this.overlayColor = palette.overlayColor;
    this.overlayTargetAlpha = palette.overlayAlpha;
    this.overlay = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, palette.overlayColor, 1)
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setScale(1 / zoom)
      .setDepth(28)
      .setAlpha(palette.overlayAlpha)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);

    // 主角火焰光圈（世界坐标，跟随主角）
    this.glow = scene.add
      .image(0, 0, "glow")
      .setDepth(29)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.8)
      .setTint(palette.glowColor);
    this.applyGlowSize(palette);

    // 暗角（最上层世界元素，不影响 HUD 场景）
    this.vignette = scene.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "vignette")
      .setScrollFactor(0)
      .setScale(1 / zoom)
      .setDepth(90)
      .setAlpha(palette.vignetteAlpha);
  }

  private applyGlowSize(palette: BiomePalette): void {
    // 暗 biome 光圈更大，像火把照亮范围。世界坐标缩放：拉远后是贴着小角色的紧致光晕。
    const radius = 120 + palette.overlayAlpha * 220;
    this.baseGlowScale = (radius * 2) / 256;
    this.glow.setScale(this.baseGlowScale);
  }

  setBiome(palette: BiomePalette): void {
    this.applyGlowSize(palette);
    const fromGlow = (this.glow.tintTopLeft as number) || palette.glowColor;
    const fromOverlay = this.overlayColor;
    const fromOverlayA = this.overlayTargetAlpha;
    const fromVigA = this.vignette.alpha;
    this.overlayColor = palette.overlayColor;
    this.overlayTargetAlpha = palette.overlayAlpha;

    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 1200,
      ease: "Sine.easeInOut",
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        this.glow.setTint(lerpColor(fromGlow, palette.glowColor, t));
        this.overlay.setFillStyle(lerpColor(fromOverlay, palette.overlayColor, t));
        this.overlay.setAlpha(Phaser.Math.Linear(fromOverlayA, palette.overlayAlpha, t));
        this.vignette.setAlpha(Phaser.Math.Linear(fromVigA, palette.vignetteAlpha, t));
      },
    });
  }

  update(x: number, y: number, time: number): void {
    this.glow.setPosition(x, y);
    if (!this.reducedMotion) {
      const pulse = 1 + Math.sin(time / 180) * 0.06;
      this.glow.setScale(this.baseGlowScale * pulse);
    }
  }

  destroy(): void {
    this.glow.destroy();
    this.overlay.destroy();
    this.vignette.destroy();
  }
}
