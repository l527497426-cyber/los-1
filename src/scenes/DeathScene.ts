import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config";
import { load, recordRun } from "../persist/LocalSave";
import type { RunResult } from "./RunScene";

export class DeathScene extends Phaser.Scene {
  private nickname = "";

  constructor() {
    super("Death");
  }

  create(result: RunResult): void {
    const save = load();
    this.nickname = save.nickname ?? "";

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0a14, 0.7).setOrigin(0, 0);

    this.add
      .text(cx, cy - 150, "you fell", {
        fontFamily: "Georgia, serif",
        fontSize: "44px",
        color: "#c44530",
        fontStyle: "italic",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy - 80, `${result.distanceM} m`, {
        fontFamily: "Georgia, serif",
        fontSize: "64px",
        color: "#f4b03c",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy - 30, `✦ ${result.dustScore}  ·  total ${result.totalScore}`, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#f3d77b",
      })
      .setOrigin(0.5);

    // 最高分对比
    const isNewBest = result.totalScore > save.bestTotalScore;
    if (isNewBest && save.bestTotalScore > 0) {
      this.add
        .text(cx, cy + 4, "new personal best!", {
          fontFamily: "monospace",
          fontSize: "13px",
          color: "#7be0d6",
        })
        .setOrigin(0.5);
    } else if (save.bestTotalScore > 0) {
      this.add
        .text(cx, cy + 4, `best  ${save.bestDistance}m  ·  ${save.bestTotalScore}`, {
          fontFamily: "monospace",
          fontSize: "13px",
          color: "#8a8576",
        })
        .setOrigin(0.5);
    }

    // 昵称输入
    this.add
      .text(cx, cy + 50, "nickname  (a-z 0-9, max 16)", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#8a8576",
      })
      .setOrigin(0.5);

    const nameText = this.add
      .text(cx, cy + 76, this.nickname || "_", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#eae6d5",
        backgroundColor: "rgba(255,255,255,0.06)",
        padding: { x: 14, y: 6 },
      })
      .setOrigin(0.5);

    this.input.keyboard?.on("keydown", (e: KeyboardEvent) => {
      if (e.key === "Backspace") {
        this.nickname = this.nickname.slice(0, -1);
      } else if (e.key === "Enter") {
        this.confirm(result);
        return;
      } else if (e.key === "Escape") {
        this.scene.start("Menu");
        return;
      } else if (e.key.length === 1 && /^[A-Za-z0-9_\- ]$/.test(e.key) && this.nickname.length < 16) {
        this.nickname += e.key;
      }
      nameText.setText(this.nickname || "_");
    });

    // 按钮提示
    this.add
      .text(cx, GAME_HEIGHT - 60, "ENTER  retry          ESC  menu", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#8a8576",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: nameText,
      alpha: { from: 1, to: 0.7 },
      yoyo: true,
      repeat: -1,
      duration: 700,
    });
  }

  private confirm(result: RunResult): void {
    recordRun(result.distanceM, result.totalScore, this.nickname);
    this.scene.start("Run");
  }
}
