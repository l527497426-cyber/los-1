import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, BIOMES, biomeForMeters, type BiomePalette } from "../config";
import { Sfx } from "../fx/Sfx";

function lerpColor(a: number, b: number, t: number): number {
  const ca = Phaser.Display.Color.IntegerToColor(a);
  const cb = Phaser.Display.Color.IntegerToColor(b);
  const r = Math.round(Phaser.Math.Linear(ca.red, cb.red, t));
  const g = Math.round(Phaser.Math.Linear(ca.green, cb.green, t));
  const bl = Math.round(Phaser.Math.Linear(ca.blue, cb.blue, t));
  return (r << 16) | (g << 8) | bl;
}

// 按距离推进区域：平滑过渡背景调色板 + 切换环境飘浮物 + 发横幅事件。
export class BiomeController {
  private current: BiomePalette;
  private ambient?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    private scene: Phaser.Scene,
    private bgFar: Phaser.GameObjects.Rectangle,
    private bgMid: Phaser.GameObjects.TileSprite,
    private reducedMotion: boolean,
  ) {
    this.current = BIOMES[0]!;
    this.scene.cameras.main.setBackgroundColor(this.current.sky);
    this.bgFar.setFillStyle(this.current.far);
    this.bgMid.setTexture(this.current.silhouette);
    this.bgMid.setTint(this.current.mid);
    this.setAmbient(this.current);
  }

  // 给地形染色用：按 chunk 世界位置取所属区域 tint。
  tintFor(originTileX: number): { stone: number; spike: number } {
    const b = biomeForMeters(originTileX);
    return { stone: b.stoneTint, spike: b.spikeTint };
  }

  update(distanceMeters: number): void {
    const b = biomeForMeters(distanceMeters);
    if (b.id === this.current.id) return;
    const from = this.current;
    this.current = b;
    this.transitionColors(from, b);
    this.setAmbient(b);
    this.scene.events.emit("biome", b);
    Sfx.play("biome");
  }

  private transitionColors(from: BiomePalette, to: BiomePalette): void {
    const cam = this.scene.cameras.main;
    this.bgMid.setTexture(to.silhouette);
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 1200,
      ease: "Sine.easeInOut",
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        cam.setBackgroundColor(lerpColor(from.sky, to.sky, t));
        this.bgFar.setFillStyle(lerpColor(from.far, to.far, t));
        this.bgMid.setTint(lerpColor(from.mid, to.mid, t));
      },
    });
  }

  private setAmbient(b: BiomePalette): void {
    if (this.ambient) {
      this.ambient.destroy();
      this.ambient = undefined;
    }
    if (this.reducedMotion || b.ambient === "none") return;

    const cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
      x: { min: 0, max: GAME_WIDTH },
      y: { min: 0, max: GAME_HEIGHT },
      tint: b.ambientColor,
      blendMode: "ADD",
      scale: { start: 1.6, end: 0 },
    };

    if (b.ambient === "embers") {
      cfg.lifespan = 4000;
      cfg.frequency = 260;
      cfg.speedY = { min: -42, max: -16 };
      cfg.speedX = { min: -12, max: 12 };
      cfg.alpha = { start: 0.6, end: 0 };
    } else if (b.ambient === "spores") {
      cfg.lifespan = 6000;
      cfg.frequency = 200;
      cfg.speedY = { min: 8, max: 26 };
      cfg.speedX = { min: -14, max: 14 };
      cfg.alpha = { start: 0.45, end: 0 };
    } else {
      // motes
      cfg.lifespan = 5000;
      cfg.frequency = 240;
      cfg.speedY = { min: -7, max: 7 };
      cfg.speedX = { min: -7, max: 7 };
      cfg.alpha = { start: 0.32, end: 0 };
    }

    this.ambient = this.scene.add
      .particles(0, 0, "px", cfg)
      .setScrollFactor(0)
      .setDepth(2);
  }

  destroy(): void {
    if (this.ambient) {
      this.ambient.destroy();
      this.ambient = undefined;
    }
  }
}
