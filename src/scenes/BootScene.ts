import Phaser from "phaser";
import { TILE, GAME_WIDTH, GAME_HEIGHT, COLOR } from "../config";

// 生成全部"占位 sprite"作为运行时纹理（程序化，零素材）。
// 后期把这些 key 换成 image2 产出的 PNG / atlas 即可。
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create(): void {
    this.generateTextures();
    this.scene.start("Menu");
  }

  private generateTextures(): void {
    this.makeFlameTexture("player", false);
    this.makeFlameTexture("player_hurt", true);

    this.makeStoneTexture("tile_stone", TILE);
    this.makeSpikeTexture("tile_spike", TILE);

    this.makeKoboldTexture("kobold", 24, 28);

    this.makeDustTexture("pickup_dust", 14);
    this.makeHeartTexture("pickup_heart", 18);

    this.makeOrbTexture("bash_anchor", 22, COLOR.bashAnchor);

    // 光照 / 氛围
    this.makeRadialTexture("glow", 256, 1, 1, 1, 0); // 白→透明
    this.makeVignetteTexture("vignette", GAME_WIDTH, GAME_HEIGHT);

    // biome 视差远景剪影（可横向平铺）
    this.makeSilhouette("sil_swordcoast", "castle");
    this.makeSilhouette("sil_feywild", "fey");
    this.makeSilhouette("sil_underdark", "cave");
    this.makeSilhouette("sil_abyss", "abyss");

    // 全景探索背景：遗迹拱门剪影 + 瀑布
    this.makeRuinsSilhouette("sil_ruins");
    this.makeWaterfallTexture("bg_waterfall");

    // 1px 白点（粒子）
    this.makePixel("px");
  }

  // ── 主角：小火苗 ──────────────────────────────
  private makeFlameTexture(key: string, hurt: boolean): void {
    const w = 22;
    const h = 32;
    const g = this.add.graphics();
    const outer = hurt ? 0xffd0b0 : 0xc4631a;
    const mid = hurt ? 0xffe9d0 : COLOR.player;
    const core = hurt ? 0xffffff : 0xffe9b0;

    // 外层火焰轮廓
    g.fillStyle(outer, 1);
    g.fillEllipse(w / 2, 22, 18, 20);
    g.fillTriangle(w / 2, 0, 4, 16, 18, 16);
    // 中层
    g.fillStyle(mid, 1);
    g.fillEllipse(w / 2, 23, 12, 15);
    g.fillTriangle(w / 2, 6, 7, 18, 15, 18);
    // 内核
    g.fillStyle(core, 1);
    g.fillEllipse(w / 2, 25, 6, 9);
    // 眼睛
    g.fillStyle(0x2a1f0a, hurt ? 0.4 : 1);
    g.fillCircle(8, 22, 1.6);
    g.fillCircle(14, 22, 1.6);

    g.generateTexture(key, w, h);
    g.destroy();
  }

  // ── 地牢石砖：带噪点 + 砖缝 ──────────────────
  private makeStoneTexture(key: string, size: number): void {
    const ct = this.textures.createCanvas(key, size, size);
    if (!ct) return;
    const ctx = ct.getContext();
    const base = COLOR.tileStone;
    ctx.fillStyle = this.hex(base);
    ctx.fillRect(0, 0, size, size);

    // 噪点
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(Math.random() * size);
      const y = Math.floor(Math.random() * size);
      const light = Math.random() > 0.5;
      ctx.fillStyle = light ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.12)";
      ctx.fillRect(x, y, 2, 2);
    }
    // 砖缝（暗线）
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, size / 2 + 0.5);
    ctx.lineTo(size, size / 2 + 0.5);
    ctx.moveTo(size / 2 + 0.5, 0);
    ctx.lineTo(size / 2 + 0.5, size / 2);
    ctx.stroke();
    // 顶部高光
    ctx.fillStyle = this.hex(COLOR.tileStoneEdge);
    ctx.fillRect(0, 0, size, 2);
    // 底部阴影
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(0, size - 2, size, 2);

    ct.refresh();
  }

  // ── 尖刺：金属/骨刺 ──────────────────────────
  private makeSpikeTexture(key: string, size: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x0b0a14, 1);
    g.fillRect(0, 0, size, size);
    const count = 3;
    const w = size / count;
    for (let i = 0; i < count; i++) {
      const x = i * w;
      // 刺主体
      g.fillStyle(COLOR.tileSpike, 1);
      g.fillTriangle(x, size, x + w / 2, 3, x + w, size);
      // 左侧高光
      g.fillStyle(0xf0c0a0, 0.7);
      g.fillTriangle(x + w / 2, 3, x + w * 0.42, size, x + w / 2, size);
    }
    g.generateTexture(key, size, size);
    g.destroy();
  }

  // ── 龙裔小怪 ──────────────────────────────────
  private makeKoboldTexture(key: string, w: number, h: number): void {
    const g = this.add.graphics();
    // 身体
    g.fillStyle(COLOR.kobold, 1);
    g.fillEllipse(w / 2, h * 0.6, w - 4, h * 0.7);
    // 头
    g.fillCircle(w / 2, h * 0.32, w * 0.32);
    // 角
    g.fillStyle(0x4a1c1c, 1);
    g.fillTriangle(w * 0.34, h * 0.18, w * 0.42, h * 0.02, w * 0.46, h * 0.2);
    g.fillTriangle(w * 0.66, h * 0.18, w * 0.58, h * 0.02, w * 0.54, h * 0.2);
    // 眼睛
    g.fillStyle(0xffd24a, 1);
    g.fillCircle(w * 0.4, h * 0.32, 2);
    g.fillCircle(w * 0.6, h * 0.32, 2);
    g.fillStyle(0x000000, 1);
    g.fillCircle(w * 0.4, h * 0.32, 0.9);
    g.fillCircle(w * 0.6, h * 0.32, 0.9);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  // ── 魔法尘：四角星 ───────────────────────────
  private makeDustTexture(key: string, size: number): void {
    const g = this.add.graphics();
    const c = size / 2;
    g.fillStyle(COLOR.dust, 0.9);
    // 竖/横长菱形十字
    g.fillTriangle(c, 0, c - 2, c, c, c);
    g.fillTriangle(c, size, c - 2, c, c, c);
    g.fillTriangle(c, c, c + 2, c, c, 0);
    g.fillTriangle(c, c, c + 2, c, c, size);
    g.fillTriangle(0, c, c, c - 2, c, c);
    g.fillTriangle(size, c, c, c - 2, c, c);
    g.fillTriangle(c, c, c, c + 2, 0, c);
    g.fillTriangle(c, c, c, c + 2, size, c);
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(c, c, 2);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  // ── 心火果实 ─────────────────────────────────
  private makeHeartTexture(key: string, size: number): void {
    const g = this.add.graphics();
    const r = size / 4;
    g.fillStyle(COLOR.heart, 1);
    g.fillCircle(size / 2 - r, r, r);
    g.fillCircle(size / 2 + r, r, r);
    g.fillTriangle(0, r * 1.1, size, r * 1.1, size / 2, size);
    // 内部火光
    g.fillStyle(0xffd24a, 0.85);
    g.fillCircle(size / 2, r * 1.4, r * 0.7);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(size / 2, r * 1.2, r * 0.3);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  // ── 奥术法球 ─────────────────────────────────
  private makeOrbTexture(key: string, size: number, color: number): void {
    const g = this.add.graphics();
    const c = size / 2;
    g.fillStyle(color, 0.22);
    g.fillCircle(c, c, c);
    g.fillStyle(color, 0.85);
    g.fillCircle(c, c, c * 0.55);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(c - 1.5, c - 1.5, c * 0.22);
    // 符文小点环
    g.fillStyle(color, 0.9);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.fillCircle(c + Math.cos(a) * c * 0.78, c + Math.sin(a) * c * 0.78, 1.2);
    }
    g.generateTexture(key, size, size);
    g.destroy();
  }

  // ── 径向渐变（白→透明），用于光照 ────────────
  private makeRadialTexture(
    key: string,
    size: number,
    r: number,
    gr: number,
    b: number,
    _unused: number,
  ): void {
    const ct = this.textures.createCanvas(key, size, size);
    if (!ct) return;
    const ctx = ct.getContext();
    const c = size / 2;
    const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
    const rgb = `${Math.round(r * 255)},${Math.round(gr * 255)},${Math.round(b * 255)}`;
    grad.addColorStop(0, `rgba(${rgb},1)`);
    grad.addColorStop(0.4, `rgba(${rgb},0.5)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    ct.refresh();
  }

  // ── 暗角 ─────────────────────────────────────
  private makeVignetteTexture(key: string, w: number, h: number): void {
    const ct = this.textures.createCanvas(key, w, h);
    if (!ct) return;
    const ctx = ct.getContext();
    const cx = w / 2;
    const cy = h / 2;
    const grad = ctx.createRadialGradient(cx, cy, h * 0.35, cx, cy, w * 0.62);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.7, "rgba(0,0,0,0.35)");
    grad.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ct.refresh();
  }

  // ── 视差远景剪影（白色，运行时 tint；横向无缝平铺）──
  private makeSilhouette(key: string, kind: "castle" | "fey" | "cave" | "abyss"): void {
    const w = 512;
    const h = 200;
    const baseY = h - 26;          // 连续基线，保证平铺无缝
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, baseY, w, h - baseY);

    const motif = (x0: number, span: number) => {
      if (kind === "castle") {
        // 城楼 + 尖塔
        g.fillRect(x0, baseY - 38, span * 0.6, 38);
        for (let i = 0; i < 4; i++) g.fillRect(x0 + i * span * 0.16, baseY - 48, span * 0.08, 12);
        g.fillTriangle(x0 + span * 0.72, baseY - 70, x0 + span * 0.64, baseY - 30, x0 + span * 0.8, baseY - 30);
        g.fillRect(x0 + span * 0.68, baseY - 30, span * 0.12, 30);
      } else if (kind === "fey") {
        // 蘑菇 + 弯树
        g.fillRect(x0 + span * 0.3, baseY - 40, span * 0.06, 40);
        g.fillEllipse(x0 + span * 0.33, baseY - 42, span * 0.34, 22);
        g.fillRect(x0 + span * 0.66, baseY - 30, span * 0.05, 30);
        g.fillEllipse(x0 + span * 0.685, baseY - 32, span * 0.22, 16);
      } else if (kind === "cave") {
        // 石笋
        g.fillTriangle(x0 + span * 0.2, baseY, x0 + span * 0.3, baseY - 56, x0 + span * 0.4, baseY);
        g.fillTriangle(x0 + span * 0.55, baseY, x0 + span * 0.62, baseY - 36, x0 + span * 0.7, baseY);
        g.fillTriangle(x0 + span * 0.78, baseY, x0 + span * 0.86, baseY - 48, x0 + span * 0.94, baseY);
      } else {
        // abyss 锯齿尖峰
        g.fillTriangle(x0, baseY, x0 + span * 0.25, baseY - 64, x0 + span * 0.5, baseY);
        g.fillTriangle(x0 + span * 0.45, baseY, x0 + span * 0.7, baseY - 44, x0 + span * 0.95, baseY);
      }
    };

    const cols = 2;
    const span = w / cols;
    for (let i = 0; i < cols; i++) motif(i * span, span);

    g.generateTexture(key, w, h);
    g.destroy();
  }

  // ── 中景遗迹剪影：拱门 + 断柱 + 平台，横向无缝平铺（白色，运行时 tint）──
  private makeRuinsSilhouette(key: string): void {
    const w = 512;
    const h = 260;
    const baseY = h - 18;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, baseY, w, h - baseY);

    // 一个"遗迹单元"：连拱柱廊 + 一根断柱 + 一块悬空平台
    const unit = (x0: number, span: number) => {
      const colW = span * 0.05;
      // 柱廊基座
      g.fillRect(x0 + span * 0.08, baseY - 70, span * 0.5, 14);
      // 三根立柱 + 拱
      for (let i = 0; i < 3; i++) {
        const cx = x0 + span * (0.12 + i * 0.2);
        g.fillRect(cx, baseY - 70, colW, 70);
        // 拱顶（用两个三角近似半圆）
        if (i < 2) {
          const ax = cx + colW;
          const aw = span * 0.2 - colW;
          g.fillRect(ax, baseY - 84, aw, 10);
          g.fillTriangle(ax, baseY - 74, ax + aw / 2, baseY - 96, ax + aw, baseY - 74);
        }
      }
      // 断柱
      g.fillRect(x0 + span * 0.7, baseY - 46, colW * 1.2, 46);
      g.fillRect(x0 + span * 0.69, baseY - 50, colW * 1.4, 6);
      // 悬空平台 + 垂藤
      g.fillRect(x0 + span * 0.78, baseY - 96, span * 0.18, 10);
      for (let v = 0; v < 3; v++) {
        const vx = x0 + span * (0.8 + v * 0.05);
        g.fillRect(vx, baseY - 86, 2, 14 + v * 6);
      }
    };

    const cols = 2;
    const span = w / cols;
    for (let i = 0; i < cols; i++) unit(i * span, span);

    g.generateTexture(key, w, h);
    g.destroy();
  }

  // ── 瀑布条纹：透明底 + 竖直柔光条，横向平铺、纵向滚动 ──
  private makeWaterfallTexture(key: string): void {
    const w = 256;
    const h = 256;
    const ct = this.textures.createCanvas(key, w, h);
    if (!ct) return;
    const ctx = ct.getContext();
    ctx.clearRect(0, 0, w, h);
    // 两道瀑布柱
    const falls = [
      { x: w * 0.32, width: 26 },
      { x: w * 0.72, width: 18 },
    ];
    for (const f of falls) {
      const grad = ctx.createLinearGradient(f.x - f.width / 2, 0, f.x + f.width / 2, 0);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.5, "rgba(255,255,255,0.85)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(f.x - f.width / 2, 0, f.width, h);
      // 内部细流
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      for (let i = 0; i < 6; i++) {
        const sx = f.x - f.width / 2 + Math.random() * f.width;
        ctx.fillRect(sx, Math.random() * h, 1, 30 + Math.random() * 40);
      }
    }
    ct.refresh();
  }

  private makePixel(key: string): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 2, 2);
    g.generateTexture(key, 2, 2);
    g.destroy();
  }

  private hex(n: number): string {
    return "#" + n.toString(16).padStart(6, "0");
  }
}
