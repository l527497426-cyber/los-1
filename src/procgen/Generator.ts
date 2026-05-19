import { Rng } from "./rng";
import { CHUNKS, STARTER_CHUNK_ID, getChunk } from "./chunks";
import type { ChunkTemplate, PlacedChunk } from "./types";

interface GeneratorOpts {
  seed: number;
}

export class Generator {
  private rng: Rng;
  // 玩家解锁的动作（MVP 全部默认解锁）
  private unlocked: Set<string> = new Set(["jump", "doubleJump", "dash", "wallJump", "glide", "bash"]);
  // 已放置的 chunks（按 frontierTileX 排序）
  private placed: PlacedChunk[] = [];
  // 最近放过的 chunk id，用作避免短期重复
  private recent: string[] = [];
  private readonly recentLookback = 4;
  // 下一个 chunk 的起点 tileX
  public frontierTileX = 0;
  // 当前出口 tileY（绝对坐标 = entry chunk 内 y + 当时 originTileX 的 y 偏移，但这里我们不做 y 偏移，所有 chunk 顶对齐）
  private lastExitTileY: number;

  constructor(opts: GeneratorOpts) {
    this.rng = new Rng(opts.seed);
    // 起始 chunk 先放
    const starter = getChunk(STARTER_CHUNK_ID)!;
    this.placed.push({ template: starter, originTileX: 0, exitTileY: starter.exitY });
    this.frontierTileX = starter.widthTiles;
    this.lastExitTileY = starter.exitY;
    this.recent.push(starter.id);
  }

  // 调用方传当前需要保证存在内容的 tileX（通常 = 摄像机右沿 + 2 屏 buffer）
  ensureUpTo(targetTileX: number): PlacedChunk[] {
    const newlyPlaced: PlacedChunk[] = [];
    let safety = 50;
    while (this.frontierTileX < targetTileX && safety-- > 0) {
      const chunk = this.pickNext();
      const placed: PlacedChunk = {
        template: chunk,
        originTileX: this.frontierTileX,
        exitTileY: chunk.exitY,
      };
      this.placed.push(placed);
      newlyPlaced.push(placed);
      this.frontierTileX += chunk.widthTiles;
      this.lastExitTileY = chunk.exitY;
      this.recent.push(chunk.id);
      if (this.recent.length > this.recentLookback) this.recent.shift();
    }
    return newlyPlaced;
  }

  // 卸载在 leftBoundTileX 左侧的 chunks，返回被卸载的列表
  unloadBefore(leftBoundTileX: number): PlacedChunk[] {
    const removed: PlacedChunk[] = [];
    while (
      this.placed.length > 0 &&
      this.placed[0]!.originTileX + this.placed[0]!.template.widthTiles < leftBoundTileX
    ) {
      removed.push(this.placed.shift()!);
    }
    return removed;
  }

  // 距离驱动的难度
  private difficultyFor(distanceMeters: number): number {
    return Math.max(1, Math.min(5, 1 + Math.floor(distanceMeters / 60)));
  }

  private pickNext(): ChunkTemplate {
    // MVP：用 frontierTileX/16（约 30 米一档）粗略难度
    const distMeters = this.frontierTileX;
    const maxDiff = this.difficultyFor(distMeters);
    const candidates = CHUNKS.filter((c) => {
      if (c.id === STARTER_CHUNK_ID) return false;
      if (c.difficulty > maxDiff) return false;
      if (this.recent.includes(c.id)) return false;
      // entryY 与上次 exitY 的高度差不能超过 3 tile
      if (Math.abs(c.entryY - this.lastExitTileY) > 3) return false;
      // requires 必须全部解锁（MVP 永远满足）
      if (c.requires && !c.requires.every((m) => this.unlocked.has(m))) return false;
      return true;
    });

    if (candidates.length === 0) {
      // 兜底：放 warmup
      return getChunk(STARTER_CHUNK_ID)!;
    }

    // 加权：越接近最大难度权重越高，营造爬坡感
    const weights = candidates.map((c) => 0.3 + c.difficulty * 0.4);
    return this.rng.weightedPick(candidates, weights);
  }
}
