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

function darken(c: number, mul: number): number {
  const col = Phaser.Display.Color.IntegerToColor(c);
  return (
    (Math.round(col.red * mul) << 16) |
    (Math.round(col.green * mul) << 8) |
    Math.round(col.blue * mul)
  );
}

// 分层视差背景：洞窟纵深 + 远/近遗迹拱门剪影 + 瀑布 + 底部水体。
// 摄像机被拉远（zoom<1），但这些层用 scrollFactor(0) 固定在屏幕上，
// 通过 scale=1/zoom + 坐标反算让它们仍恰好铺满 960×540 视口。
export class Backdrop {
  private zoom: number;
  private bgFar: Phaser.GameObjects.Rectangle;
  private ruinsFar: Phaser.GameObjects.TileSprite;
  private ruinsNear: Phaser.GameObjects.TileSprite;
  private waterfall: Phaser.GameObjects.TileSprite;
  private water: Phaser.GameObjects.Rectangle;
  private waterline: Phaser.GameObjects.Rectangle;
  private current: BiomePalette;

  constructor(
    private scene: Phaser.Scene,
    palette: BiomePalette,
    zoom: number,
    private reducedMotion: boolean,
  ) {
    this.zoom = zoom;
    this.current = palette;

    // 洞窟纵深（下 62% 染色，上方留给摄像机 sky 背景）
    this.bgFar = this.mkRect(GAME_WIDTH, GAME_HEIGHT * 0.62, palette.far, 1)
      .setOrigin(0.5, 1)
      .setDepth(0);
    this.place(this.bgFar, GAME_WIDTH / 2, GAME_HEIGHT);

    // 远景遗迹剪影（biome 专属）
    this.ruinsFar = this.mkTile(GAME_WIDTH, 200, palette.silhouette)
      .setOrigin(0.5, 1)
      .setTint(darken(palette.mid, 0.7))
      .setAlpha(0.45)
      .setDepth(1);
    this.place(this.ruinsFar, GAME_WIDTH / 2, GAME_HEIGHT * 0.66);

    // 瀑布（加色滚动）
    this.waterfall = this.mkTile(GAME_WIDTH, GAME_HEIGHT, "bg_waterfall")
      .setOrigin(0.5, 0.5)
      .setTint(palette.waterfall)
      .setAlpha(0.16)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(1);
    this.place(this.waterfall, GAME_WIDTH / 2, GAME_HEIGHT / 2);

    // 近景遗迹拱门
    this.ruinsNear = this.mkTile(GAME_WIDTH, 260, "sil_ruins")
      .setOrigin(0.5, 1)
      .setTint(palette.mid)
      .setAlpha(0.6)
      .setDepth(2);
    this.place(this.ruinsNear, GAME_WIDTH / 2, GAME_HEIGHT * 0.78);

    // 底部水体 + 水线高光
    this.water = this.mkRect(GAME_WIDTH, GAME_HEIGHT * 0.3, palette.water, 0.5)
      .setOrigin(0.5, 1)
      .setDepth(3);
    this.place(this.water, GAME_WIDTH / 2, GAME_HEIGHT);
    this.waterline = this.mkRect(GAME_WIDTH, 3, palette.waterfall, 0.4)
      .setOrigin(0.5, 0.5)
      .setDepth(3);
    this.place(this.waterline, GAME_WIDTH / 2, GAME_HEIGHT * 0.7);
  }

  private mkRect(w: number, h: number, color: number, alpha: number): Phaser.GameObjects.Rectangle {
    return this.scene.add.rectangle(0, 0, w, h, color, alpha);
  }

  private mkTile(w: number, h: number, key: string): Phaser.GameObjects.TileSprite {
    return this.scene.add.tileSprite(0, 0, w, h, key);
  }

  // scrollFactor(0) + scale=1/zoom + 坐标反算 ⇒ 在拉远的视口里仍精确铺满屏幕。
  private place(
    obj: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.Components.ScrollFactor,
    screenX: number,
    screenY: number,
  ): void {
    obj.setScrollFactor(0);
    obj.setScale(1 / this.zoom);
    obj.setPosition(this.fx(screenX), this.fy(screenY));
  }

  private fx(s: number): number {
    return (s - GAME_WIDTH / 2) / this.zoom + GAME_WIDTH / 2;
  }
  private fy(s: number): number {
    return (s - GAME_HEIGHT / 2) / this.zoom + GAME_HEIGHT / 2;
  }

  setBiome(palette: BiomePalette): void {
    const from = this.current;
    this.current = palette;
    this.ruinsFar.setTexture(palette.silhouette);
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 1200,
      ease: "Sine.easeInOut",
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        this.bgFar.setFillStyle(lerpColor(from.far, palette.far, t));
        this.ruinsFar.setTint(lerpColor(darken(from.mid, 0.7), darken(palette.mid, 0.7), t));
        this.ruinsNear.setTint(lerpColor(from.mid, palette.mid, t));
        this.waterfall.setTint(lerpColor(from.waterfall, palette.waterfall, t));
        this.water.setFillStyle(lerpColor(from.water, palette.water, t));
        this.waterline.setFillStyle(lerpColor(from.waterfall, palette.waterfall, t));
      },
    });
  }

  update(scrollX: number, dtMs: number): void {
    this.ruinsFar.tilePositionX = scrollX * 0.18;
    this.ruinsNear.tilePositionX = scrollX * 0.42;
    this.waterfall.tilePositionX = scrollX * 0.4;
    if (!this.reducedMotion) {
      this.waterfall.tilePositionY -= dtMs * 0.05;
    }
  }

  destroy(): void {
    this.bgFar.destroy();
    this.ruinsFar.destroy();
    this.ruinsNear.destroy();
    this.waterfall.destroy();
    this.water.destroy();
    this.waterline.destroy();
  }
}
