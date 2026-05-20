import Phaser from "phaser";
import { TILE } from "../config";
import type { PlacedChunk } from "../procgen/types";

const COOLDOWN_FRAMES = 45;   // 被 bash 后多久恢复可用

// 悬浮的可 Bash 锚点：纯位移用，本身不动、不接触伤害。
// 被 bash 后短暂冷却（变暗、不可再选），防止在同一锚点反复弹射卡住。
export interface AnchorSprite extends Phaser.Physics.Arcade.Sprite {
  isAnchor: true;
  baseY: number;
  phase: number;
  available: boolean;
  cooldownLeft: number;
  onBashed: () => void;
}

export class Anchors {
  scene: Phaser.Scene;
  group: Phaser.Physics.Arcade.Group;
  private chunkSprites: Map<string, AnchorSprite[]> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.group = scene.physics.add.group({ allowGravity: false, immovable: true });
  }

  buildChunk(p: PlacedChunk): AnchorSprite[] {
    const created: AnchorSprite[] = [];
    const items = p.template.bashAnchors ?? [];
    for (const it of items) {
      const wx = (p.originTileX + it.x) * TILE + TILE / 2;
      const wy = it.y * TILE + TILE / 2;
      const s = this.group.create(wx, wy, "bash_anchor") as AnchorSprite;
      s.isAnchor = true;
      s.baseY = wy;
      s.phase = Math.random() * Math.PI * 2;
      s.available = true;
      s.cooldownLeft = 0;
      s.setDepth(16);
      const body = s.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.setImmovable(true);
      body.moves = false;                          // 不被 bash 反推
      s.onBashed = () => {
        s.available = false;
        s.cooldownLeft = COOLDOWN_FRAMES;
        s.setAlpha(0.25);
      };
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
      const s = c as AnchorSprite;
      if (!s || !s.active) return true;
      s.y = s.baseY + Math.sin(time / 320 + s.phase) * 4;
      s.setScale(1 + Math.sin(time / 260 + s.phase) * 0.08);
      if (s.cooldownLeft > 0) {
        s.cooldownLeft--;
        if (s.cooldownLeft === 0) {
          s.available = true;
          s.setAlpha(1);
        }
      }
      return true;
    });
  }

  private key(p: PlacedChunk): string {
    return `${p.template.id}@${p.originTileX}`;
  }
}
