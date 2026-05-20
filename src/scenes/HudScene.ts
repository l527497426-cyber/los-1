import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLOR, PLAYER, SCORE, type BiomePalette } from "../config";
import type { RunScene } from "./RunScene";
import { TouchControls } from "../ui/TouchControls";
import { hasTouch } from "../ui/touchState";

interface HudData {
  run: RunScene;
}

export class HudScene extends Phaser.Scene {
  private hearts: Phaser.GameObjects.Image[] = [];
  private distText!: Phaser.GameObjects.Text;
  private dustText!: Phaser.GameObjects.Text;
  private dustValue = 0;
  private distValue = 0;

  constructor() {
    super("Hud");
  }

  create(data: HudData): void {
    // HP 心
    for (let i = 0; i < PLAYER.maxHp; i++) {
      const img = this.add
        .image(20 + i * 26, 22, "pickup_heart")
        .setOrigin(0.5)
        .setScale(1.1);
      this.hearts.push(img);
    }

    this.distText = this.add
      .text(GAME_WIDTH / 2, 20, "0 m", {
        fontFamily: "Georgia, serif",
        fontSize: "26px",
        color: "#eae6d5",
      })
      .setOrigin(0.5, 0.5);

    this.dustText = this.add
      .text(GAME_WIDTH - 12, 20, "✦ 0", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#f3d77b",
      })
      .setOrigin(1, 0.5);

    const run = data.run;
    run.events.on("hp", (hp: number) => this.updateHp(hp));
    run.events.on("distance", (d: number) => this.updateDist(d));
    run.events.on("dust", (n: number) => this.updateDust(n));
    run.events.on("biome", (b: BiomePalette) => this.showBiomeBanner(b));

    // 触屏控件（只在检测到触屏设备时显示）
    if (hasTouch()) {
      new TouchControls(this);
    }

    this.events.once("shutdown", () => {
      run.events.off("hp");
      run.events.off("distance");
      run.events.off("dust");
      run.events.off("biome");
    });
  }

  private showBiomeBanner(b: BiomePalette): void {
    const color = "#" + b.ambientColor.toString(16).padStart(6, "0");
    const banner = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.34, `✦  Entering ${b.name}  ✦`, {
        fontFamily: "Georgia, serif",
        fontSize: "30px",
        color,
        fontStyle: "italic",
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({
      targets: banner,
      alpha: { from: 0, to: 1 },
      duration: 500,
      yoyo: true,
      hold: 1600,
      ease: "Sine.easeInOut",
      onComplete: () => banner.destroy(),
    });
  }

  private updateHp(hp: number): void {
    for (let i = 0; i < this.hearts.length; i++) {
      const heart = this.hearts[i]!;
      heart.setAlpha(i < hp ? 1 : 0.2);
      heart.setTint(i < hp ? 0xffffff : 0x4a4a47);
    }
  }

  private updateDist(d: number): void {
    if (d === this.distValue) return;
    this.distValue = d;
    this.distText.setText(`${d} m`);
  }

  private updateDust(n: number): void {
    this.dustValue = n;
    const bonus = Math.floor(n * SCORE.dustValue * 2);
    this.dustText.setText(`✦ ${n}  (+${bonus})`);
    this.dustText.setColor("#" + COLOR.dust.toString(16).padStart(6, "0"));
  }
}
