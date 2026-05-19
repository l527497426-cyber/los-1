// 全局常量。所有手感参数集中在这里，方便调。
// 单位：px、px/s、ms（除非另注）。

export const TILE = 32;
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const COLOR = {
  bgSky: 0x0b0a14,
  bgFar: 0x1a1830,
  bgMid: 0x261f3a,
  bgNear: 0x382a4a,

  tileStone: 0x4a5560,
  tileStoneEdge: 0x6b7a89,
  tileSpike: 0xc44530,

  player: 0xf4b03c,
  playerIFrame: 0xffe9b0,

  kobold: 0x7d3a3a,
  bashAnchor: 0x7be0d6,

  dust: 0xf3d77b,
  heart: 0xe74c3c,

  hud: 0xeae6d5,
  hudDim: 0x6e6a55,
} as const;

export const PHYSICS = {
  gravity: 1400,
  glideGravityMul: 0.18,
  maxFallSpeed: 900,
  glideMaxFallSpeed: 60,
} as const;

export const PLAYER = {
  width: 22,
  height: 32,

  runMax: 230,
  runAccel: 2200,
  airAccel: 1400,
  groundFriction: 2400,
  airFriction: 400,

  jumpVel: -460,
  doubleJumpVel: -380,
  variableJumpCutMul: 0.45,
  variableJumpWindowFrames: 8,

  wallSlideGravityMul: 0.35,
  wallSlideMaxFall: 140,
  wallSlideMaxFrames: 90,
  wallJumpVelX: 260,
  wallJumpVelY: -380,
  wallJumpLockFrames: 10,

  dashSpeed: 520,
  dashFrames: 12,

  bashRange: 110,
  bashDilationFrames: 60,        // 实帧
  bashPlayerEject: 560,
  bashTargetEject: 380,
  bashMaxAimRadius: 90,

  coyoteFrames: 6,
  jumpBufferFrames: 8,
  wallJumpGraceFrames: 5,
  dashBufferFrames: 6,
  glideEngageFrames: 8,

  iframeFrames: 30,
  hurtKnockbackX: 220,
  hurtKnockbackY: -260,
  hurtLockFrames: 14,

  maxHp: 3,
} as const;

export const SCORE = {
  distancePerMeter: 32,          // px → meter（1 米 = 1 tile）
  dustValue: 0.5,                // 每粒折算 0.5 米
} as const;

export const RUN = {
  startBiome: "swordcoast" as const,
  startPlayerX: 120,
  cameraLeadX: 120,
  cameraLerp: 0.12,
  deathFallY: 1200,              // 跌落超过这个 Y 算死
};
