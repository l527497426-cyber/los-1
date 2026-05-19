import Phaser from "phaser";
import { TILE, COLOR } from "../config";

// 生成全部"占位 sprite"作为运行时纹理。
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
    // 玩家：圆角矩形 + 朝向小眼睛
    this.makeRectTexture("player", 22, 32, COLOR.player, 0x2a1f0a);
    this.makeRectTexture("player_hurt", 22, 32, COLOR.playerIFrame, 0xffffff);

    // tile
    this.makeTileTexture("tile_stone", TILE, COLOR.tileStone, COLOR.tileStoneEdge);
    this.makeSpikeTexture("tile_spike", TILE, COLOR.tileSpike);

    // kobold
    this.makeRectTexture("kobold", 24, 28, COLOR.kobold, 0x1c0a0a);

    // pickups
    this.makeDiamondTexture("pickup_dust", 12, COLOR.dust);
    this.makeHeartTexture("pickup_heart", 18, COLOR.heart);

    // bash anchor
    this.makeOrbTexture("bash_anchor", 18, COLOR.bashAnchor);

    // 1x1 白点（用于粒子等）
    this.makeRectTexture("px", 2, 2, 0xffffff, 0xffffff);
  }

  private makeRectTexture(key: string, w: number, h: number, fill: number, stroke: number): void {
    const g = this.add.graphics();
    g.fillStyle(fill, 1);
    g.fillRoundedRect(0, 0, w, h, 4);
    g.lineStyle(2, stroke, 1);
    g.strokeRoundedRect(1, 1, w - 2, h - 2, 4);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeTileTexture(key: string, size: number, fill: number, edge: number): void {
    const g = this.add.graphics();
    g.fillStyle(fill, 1);
    g.fillRect(0, 0, size, size);
    g.fillStyle(edge, 1);
    g.fillRect(0, 0, size, 3);                   // 上边高光
    g.fillStyle(fill - 0x080808, 1);
    g.fillRect(0, size - 2, size, 2);            // 下阴影
    g.generateTexture(key, size, size);
    g.destroy();
  }

  private makeSpikeTexture(key: string, size: number, color: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x0b0a14, 1);
    g.fillRect(0, 0, size, size);
    g.fillStyle(color, 1);
    const spikeCount = 4;
    const w = size / spikeCount;
    for (let i = 0; i < spikeCount; i++) {
      const x = i * w;
      g.fillTriangle(x, size, x + w / 2, size - w * 1.6, x + w, size);
    }
    g.generateTexture(key, size, size);
    g.destroy();
  }

  private makeDiamondTexture(key: string, size: number, color: number): void {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillTriangle(size / 2, 0, size, size / 2, size / 2, size);
    g.fillTriangle(size / 2, 0, 0, size / 2, size / 2, size);
    g.fillStyle(0xffffff, 0.5);
    g.fillTriangle(size / 2, 2, size * 0.7, size / 2, size / 2, size - 2);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  private makeHeartTexture(key: string, size: number, color: number): void {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    const r = size / 4;
    g.fillCircle(size / 2 - r, r, r);
    g.fillCircle(size / 2 + r, r, r);
    g.fillTriangle(0, r * 1.1, size, r * 1.1, size / 2, size);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  private makeOrbTexture(key: string, size: number, color: number): void {
    const g = this.add.graphics();
    g.fillStyle(color, 0.3);
    g.fillCircle(size / 2, size / 2, size / 2);
    g.fillStyle(color, 1);
    g.fillCircle(size / 2, size / 2, size / 3);
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(size / 2 - 2, size / 2 - 2, 2);
    g.generateTexture(key, size, size);
    g.destroy();
  }
}
