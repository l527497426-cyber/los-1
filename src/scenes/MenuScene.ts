import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLOR } from "../config";
import { load } from "../persist/LocalSave";
import { Sfx } from "../fx/Sfx";
import { drawRunicFrame, emberGlow } from "../ui/decor";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const save = load();

    // 背景渐变（简）
    const bg = this.add.graphics();
    bg.fillGradientStyle(COLOR.bgSky, COLOR.bgSky, COLOR.bgNear, COLOR.bgMid, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    drawRunicFrame(this);

    // 标题
    const title = this.add
      .text(cx, GAME_HEIGHT * 0.32, "FANCY FLAME", {
        fontFamily: "Georgia, serif",
        fontSize: "64px",
        color: "#f4b03c",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    emberGlow(title);

    this.add
      .text(cx, GAME_HEIGHT * 0.32 + 56, "one endless run · D&D embers", {
        fontFamily: "Georgia, serif",
        fontSize: "16px",
        color: "#8a8576",
        fontStyle: "italic",
      })
      .setOrigin(0.5);

    // 最高分
    if (save.bestDistance > 0) {
      this.add
        .text(
          cx,
          GAME_HEIGHT * 0.55,
          `best  ${Math.floor(save.bestDistance)} m   ·   score ${Math.floor(save.bestTotalScore)}`,
          {
            fontFamily: "monospace",
            fontSize: "14px",
            color: "#eae6d5",
          },
        )
        .setOrigin(0.5);
    }

    // 操作说明
    this.add
      .text(
        cx,
        GAME_HEIGHT * 0.68,
        [
          "← →   move        SPACE   jump (double)",
          "SHIFT  dash        DOWN    glide",
          "X / J  bash enemies & glowing orbs to chain across gaps",
          "M      mute        ·  walls are clung to automatically",
        ].join("\n"),
        {
          fontFamily: "monospace",
          fontSize: "13px",
          color: "#8a8576",
          align: "center",
          lineSpacing: 4,
        },
      )
      .setOrigin(0.5);

    // 开始按钮（兼容触屏：整屏可点）
    const startBtn = this.add
      .text(cx, GAME_HEIGHT * 0.85, "▸ TAP  /  PRESS  SPACE  TO  START", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#f4b03c",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: startBtn,
      alpha: { from: 1, to: 0.4 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    const start = () => {
      // 必须在用户手势内初始化音频
      Sfx.ensureContext();
      Sfx.setVolume(save.settings.sfxVolume);
      this.scene.start("Run");
    };
    this.input.keyboard?.once("keydown-SPACE", start);
    this.input.keyboard?.once("keydown-ENTER", start);
    this.input.once("pointerdown", start);
  }
}
