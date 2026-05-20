import Phaser from "phaser";
import { TILE } from "../config";
import type { PlacedChunk } from "../procgen/types";

// 简单巡逻：在生成点附近的水平范围里左右走，碰墙或到达巡逻边界折返。
export class Kobold extends Phaser.Physics.Arcade.Sprite {
  private dir: -1 | 1 = -1;
  private speed = 60;
  private spawnX: number;
  private patrolRange = 96;        // 离生成点最远走多远（防止走出平台/掉崖）
  public alive = true;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "kobold");
    this.spawnX = x;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(22, 26);
    body.setOffset(1, 2);
    body.setGravityY(1400);
    body.setBounce(0, 0);
    body.setCollideWorldBounds(false);
    body.setMaxVelocity(120, 1400);
    this.setDepth(18);
    this.setFlipX(this.dir === 1);
  }

  override update(): void {
    if (!this.alive) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(this.dir * this.speed);
    // 碰墙折返
    if ((this.dir === -1 && body.blocked.left) || (this.dir === 1 && body.blocked.right)) {
      this.flip();
    }
    // 巡逻边界折返（不依赖地形检测，可靠地避免走出平台）
    if (
      (this.dir === -1 && this.x <= this.spawnX - this.patrolRange) ||
      (this.dir === 1 && this.x >= this.spawnX + this.patrolRange)
    ) {
      this.flip();
    }
  }

  private flip(): void {
    this.dir = (this.dir === 1 ? -1 : 1);
    this.setFlipX(this.dir === 1);
  }

  defeat(): void {
    this.alive = false;
    this.disableBody(true, true);
  }
}

// 仅用于按 chunk 创建/卸载的容器
export class EnemyManager {
  scene: Phaser.Scene;
  group: Phaser.Physics.Arcade.Group;
  private chunkObjs: Map<string, Phaser.GameObjects.GameObject[]> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.group = scene.physics.add.group();
  }

  buildChunk(p: PlacedChunk): Phaser.GameObjects.GameObject[] {
    const created: Phaser.GameObjects.GameObject[] = [];
    const items = p.template.enemies ?? [];
    for (const it of items) {
      const wx = (p.originTileX + it.x) * TILE + TILE / 2;
      const wy = it.y * TILE - 4;
      const k = new Kobold(this.scene, wx, wy);
      this.group.add(k);
      created.push(k);
    }
    this.chunkObjs.set(this.key(p), created);
    return created;
  }

  unloadChunk(p: PlacedChunk): void {
    const arr = this.chunkObjs.get(this.key(p));
    if (!arr) return;
    for (const o of arr) o.destroy();
    this.chunkObjs.delete(this.key(p));
  }

  update(): void {
    this.group.children.iterate((c) => {
      (c as Kobold).update();
      return true;
    });
  }

  private key(p: PlacedChunk): string {
    return `${p.template.id}@${p.originTileX}`;
  }
}
