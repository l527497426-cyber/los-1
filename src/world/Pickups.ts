import Phaser from "phaser";
import { TILE } from "../config";
import type { PlacedChunk } from "../procgen/types";

export type PickupKind = "dust" | "heart";

export interface PickupSprite extends Phaser.Physics.Arcade.Sprite {
  kind: PickupKind;
  baseY: number;          // 漂浮动画基线
  phase: number;
}

export class Pickups {
  scene: Phaser.Scene;
  group: Phaser.Physics.Arcade.Group;
  private chunkSprites: Map<string, PickupSprite[]> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.group = scene.physics.add.group({ allowGravity: false, immovable: true });
  }

  buildChunk(p: PlacedChunk): PickupSprite[] {
    const created: PickupSprite[] = [];
    const items = p.template.pickups ?? [];
    for (const it of items) {
      const wx = (p.originTileX + it.x) * TILE + TILE / 2;
      const wy = it.y * TILE + TILE / 2;
      const tex = it.kind === "dust" ? "pickup_dust" : "pickup_heart";
      const s = this.group.create(wx, wy, tex) as PickupSprite;
      s.kind = it.kind;
      s.baseY = wy;
      s.phase = Math.random() * Math.PI * 2;
      s.setDepth(15);
      const body = s.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.setImmovable(true);
      created.push(s);
    }
    this.chunkSprites.set(this.key(p), created);
    return created;
  }

  unloadChunk(p: PlacedChunk): void {
    const arr = this.chunkSprites.get(this.key(p));
    if (!arr) return;
    for (const s of arr) s.destroy();
    this.chunkSprites.delete(this.key(p));
  }

  update(time: number): void {
    this.group.children.iterate((c) => {
      const s = c as PickupSprite;
      if (!s || !s.active) return true;
      s.y = s.baseY + Math.sin(time / 350 + s.phase) * 3;
      s.rotation = Math.sin(time / 600 + s.phase) * 0.3;
      return true;
    });
  }

  private key(p: PlacedChunk): string {
    return `${p.template.id}@${p.originTileX}`;
  }
}
