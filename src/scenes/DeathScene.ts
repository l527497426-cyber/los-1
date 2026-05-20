import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config";
import { load, recordRun } from "../persist/LocalSave";
import { hasTouch } from "../ui/touchState";
import { drawRunicFrame, emberGlow } from "../ui/decor";
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
    drawRunicFrame(this, 0xc44530);

    const fell = this.add
      .text(cx, cy - 150, "you fell", {
        fontFamily: "Georgia, serif",
        fontSize: "44px",
        color: "#c44530",
        fontStyle: "italic",
      })
      .setOrigin(0.5);
    emberGlow(fell, "#c44530");

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
      .text(cx, cy + 76, this.nickname || "click to set name", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#eae6d5",
        backgroundColor: "rgba(255,255,255,0.06)",
        padding: { x: 14, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // 触屏：点昵称框 → 弹出 native prompt
    const promptNick = () => {
      const v = window.prompt("nickname (max 16)", this.nickname);
      if (v != null) {
        this.nickname = v.replace(/[^A-Za-z0-9_\- ]/g, "").slice(0, 16);
        nameText.setText(this.nickname || "click to set name");
      }
    };
    nameText.on("pointerdown", promptNick);

    // 键盘快捷键：R / Enter 重开，Esc 回菜单。昵称改为点击输入框编辑，
    // 这样字母键不会被昵称输入吞掉，R 能可靠地重新开始。
    this.input.keyboard?.on("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "r" || e.key === "R") {
        this.confirm(result);
      } else if (e.key === "Escape") {
        this.scene.start("Menu");
      }
    });

    // 触屏：底部两个大按钮
    const retryBtn = this.add
      .text(cx - 90, GAME_HEIGHT - 60, "  RETRY (R)  ", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#0b0a14",
        backgroundColor: "#f4b03c",
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    retryBtn.on("pointerup", () => this.confirm(result));

    const menuBtn = this.add
      .text(cx + 90, GAME_HEIGHT - 60, "  MENU  ", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#eae6d5",
        backgroundColor: "rgba(255,255,255,0.08)",
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    menuBtn.on("pointerup", () => this.scene.start("Menu"));

    // 底部提示：触屏点昵称编辑；键盘 R/Enter 重开、Esc 回菜单
    this.add
      .text(
        cx,
        GAME_HEIGHT - 100,
        hasTouch() ? "tap nickname above to edit" : "R / Enter  retry      Esc  menu      click name to edit",
        {
          fontFamily: "monospace",
          fontSize: "11px",
          color: "#8a8576",
        },
      )
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
