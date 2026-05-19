export type Move = "jump" | "doubleJump" | "dash" | "wallJump" | "glide" | "bash";

// 0=空 1=石 2=尖刺
export type TileId = 0 | 1 | 2;

export interface ChunkTemplate {
  id: string;
  widthTiles: number;
  heightTiles: number;
  entryY: number;                                  // 左边缘玩家踩到的 tile-Y
  exitY: number;                                   // 右边缘玩家踩到的 tile-Y
  terrain: TileId[][];                             // [y][x]
  pickups?: { x: number; y: number; kind: "dust" | "heart" }[];
  enemies?: { x: number; y: number; kind: "kobold" }[];
  bashAnchors?: { x: number; y: number }[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  requires?: Move[];                               // 必须的动作子集（MVP 只用 jump/doubleJump/dash）
}

// 一个 chunk 在世界中被实例化后的元数据
export interface PlacedChunk {
  template: ChunkTemplate;
  originTileX: number;                             // 该 chunk 左上 tile 在世界 tile 坐标中的 X
  exitTileY: number;                               // 出口在世界坐标的 Y（= originTileX + width 处）
}
