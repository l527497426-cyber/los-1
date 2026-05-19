import Phaser from "phaser";
import { TILE } from "../config";
import type { PlacedChunk } from "../procgen/types";

// 把 PlacedChunk 实例化为 Phaser 物理体集合。
// 用静态组：每个 tile 是一个 32x32 sprite，自动加入 stoneGroup / spikeGroup。
export class Terrain {
  scene: Phaser.Scene;
  stones: Phaser.Physics.Arcade.StaticGroup;
  spikes: Phaser.Physics.Arcade.StaticGroup;

  // 跟踪每个 chunk 创建出的 sprite，便于卸载
  private chunkSprites: Map<string, Phaser.GameObjects.GameObject[]> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.stones = scene.physics.add.staticGroup();
    this.spikes = scene.physics.add.staticGroup();
  }

  buildChunk(p: PlacedChunk): Phaser.GameObjects.GameObject[] {
    const created: Phaser.GameObjects.GameObject[] = [];
    const { template, originTileX } = p;
    for (let y = 0; y < template.terrain.length; y++) {
      const row = template.terrain[y]!;
      for (let x = 0; x < row.length; x++) {
        const t = row[x]!;
        if (t === 0) continue;
        const worldX = (originTileX + x) * TILE + TILE / 2;
        const worldY = y * TILE + TILE / 2;
        if (t === 1) {
          const s = this.stones.create(worldX, worldY, "tile_stone");
          s.setDepth(10);
          (s.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
          created.push(s);
        } else if (t === 2) {
          const s = this.spikes.create(worldX, worldY, "tile_spike");
          s.setDepth(10);
          // 尖刺的碰撞箱小一些，更友好
          const body = s.body as Phaser.Physics.Arcade.StaticBody;
          body.setSize(TILE - 6, TILE / 2);
          body.setOffset(3, TILE / 2);
          body.updateFromGameObject();
          created.push(s);
        }
      }
    }
    this.chunkSprites.set(this.chunkKey(p), created);
    return created;
  }

  unloadChunk(p: PlacedChunk): void {
    const key = this.chunkKey(p);
    const arr = this.chunkSprites.get(key);
    if (!arr) return;
    for (const obj of arr) obj.destroy();
    this.chunkSprites.delete(key);
  }

  private chunkKey(p: PlacedChunk): string {
    return `${p.template.id}@${p.originTileX}`;
  }
}
