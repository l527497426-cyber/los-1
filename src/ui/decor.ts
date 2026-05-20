import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config";

// 程序化"符文边框"：双描边 + 四角装饰，给菜单/死亡界面一点羊皮纸卷轴感。
export function drawRunicFrame(scene: Phaser.Scene, color = 0xf4b03c): void {
  const g = scene.add.graphics();
  const m = 18;
  const w = GAME_WIDTH - m * 2;
  const h = GAME_HEIGHT - m * 2;

  g.lineStyle(2, color, 0.45);
  g.strokeRect(m, m, w, h);
  g.lineStyle(1, color, 0.25);
  g.strokeRect(m + 6, m + 6, w - 12, h - 12);

  // 四角 L 形装饰
  const a = 22;
  g.lineStyle(2, color, 0.8);
  const corner = (cx: number, cy: number, dx: number, dy: number) => {
    g.beginPath();
    g.moveTo(cx + dx * a, cy);
    g.lineTo(cx, cy);
    g.lineTo(cx, cy + dy * a);
    g.strokePath();
  };
  corner(m, m, 1, 1);
  corner(m + w, m, -1, 1);
  corner(m, m + h, 1, -1);
  corner(m + w, m + h, -1, -1);
}

// 给标题文本加余烬发光
export function emberGlow(text: Phaser.GameObjects.Text, glow = "#ff9a3c"): void {
  text.setStroke("#3a1c08", 6);
  text.setShadow(0, 0, glow, 18, true, true);
}
