import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, TILE, RUN, COLOR, SCORE, PLAYER, BIOMES, type BiomePalette } from "../config";
import { Player } from "../player/Player";
import { Generator } from "../procgen/Generator";
import { makeSeed } from "../procgen/rng";
import { Terrain } from "../world/Terrain";
import { Pickups, type PickupSprite } from "../world/Pickups";
import { EnemyManager, Kobold } from "../enemies/Kobold";
import { Juice } from "../fx/Juice";
import { Sfx } from "../fx/Sfx";
import { BiomeController } from "../world/Biome";
import { Lighting } from "../fx/Lighting";
import { Anchors, type AnchorSprite } from "../world/Anchors";
import { load, save } from "../persist/LocalSave";

interface FxStateEvent {
  prev: string;
  next: string;
  x: number;
  y: number;
  vy: number;
}
interface FxJumpEvent {
  kind: "jump" | "doubleJump" | "wallJump";
  x: number;
  y: number;
}
interface FxPointEvent {
  x: number;
  y: number;
  anchor?: boolean;
}

export interface RunResult {
  distanceM: number;
  dustScore: number;
  totalScore: number;
  seed: number;
}

export class RunScene extends Phaser.Scene {
  private player!: Player;
  private generator!: Generator;
  private terrain!: Terrain;
  private pickups!: Pickups;
  private enemies!: EnemyManager;
  private anchors!: Anchors;
  private juice!: Juice;
  private biome!: BiomeController;
  private lighting!: Lighting;

  private seed: number = 0;
  private dustScore = 0;
  private maxDistanceTiles = 0;
  private startTileX = 0;
  private dead = false;
  private mutedVolume = 0;          // 静音前的音量，用于 M 键还原

  // 背景层（简单视差，纯色 + 横向渐变）
  private bgFar?: Phaser.GameObjects.Rectangle;
  private bgMid?: Phaser.GameObjects.TileSprite;

  constructor() {
    super("Run");
  }

  create(): void {
    this.dead = false;
    this.dustScore = 0;
    this.seed = makeSeed();

    // 物理世界横向无界，纵向给个上下范围
    this.physics.world.setBounds(-1000, -2000, 1_000_000, 4000);

    // 简单背景
    this.cameras.main.setBackgroundColor(COLOR.bgSky);
    this.bgFar = this.add
      .rectangle(0, GAME_HEIGHT * 0.7, GAME_WIDTH * 4, GAME_HEIGHT, COLOR.bgFar)
      .setOrigin(0, 0)
      .setScrollFactor(0.15, 0)
      .setDepth(0);
    // 中景：biome 远景剪影（横向视差平铺）
    this.bgMid = this.add
      .tileSprite(0, GAME_HEIGHT * 0.38, GAME_WIDTH, 200, BIOMES[0]!.silhouette)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setTint(COLOR.bgMid)
      .setAlpha(0.55)
      .setDepth(1);

    // 手感特效 / 音效 / 区域
    const settings = load().settings;
    const reducedMotion =
      settings.reducedMotion ||
      (typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true);
    Sfx.ensureContext();
    Sfx.setVolume(settings.sfxVolume);
    this.mutedVolume = settings.sfxVolume > 0 ? settings.sfxVolume : 0.8;
    this.juice = new Juice(this, { screenShake: settings.screenShake, reducedMotion });
    this.biome = new BiomeController(this, this.bgFar, this.bgMid, reducedMotion);
    this.lighting = new Lighting(this, BIOMES[0]!, reducedMotion);
    this.wireFx();

    // 世界
    this.terrain = new Terrain(this);
    this.pickups = new Pickups(this);
    this.enemies = new EnemyManager(this);
    this.anchors = new Anchors(this);
    this.generator = new Generator({ seed: this.seed });

    // 先放一段确保起点能跑
    const initial = this.generator.ensureUpTo(40);
    for (const p of initial) {
      this.terrain.buildChunk(p, this.biome.tintFor(p.originTileX));
      this.pickups.buildChunk(p);
      this.enemies.buildChunk(p);
      this.anchors.buildChunk(p);
    }

    // 玩家：放在起点 chunk 入口位置
    const firstChunk = initial[0]!;
    this.startTileX = firstChunk.originTileX;
    const px = RUN.startPlayerX;
    const py = firstChunk.template.entryY * TILE - PLAYER.height;
    this.player = new Player(this, px, py);

    // 碰撞
    this.physics.add.collider(this.player, this.terrain.stones);
    this.physics.add.collider(this.enemies.group, this.terrain.stones);

    // 尖刺：重叠即扣血
    this.physics.add.overlap(this.player, this.terrain.spikes, (_p, spike) => {
      if (this.player.controller.stateName === "Bash") return;
      const s = spike as Phaser.GameObjects.GameObject & { x: number };
      this.player.takeHit(s.x);
      if (!this.player.alive) this.die();
    });

    // 拾取
    this.physics.add.overlap(this.player, this.pickups.group, (_p, raw) => {
      const item = raw as PickupSprite;
      if (!item.active) return;
      if (item.kind === "dust") {
        this.dustScore += 1;
        this.events.emit("dust", this.dustScore);
        this.juice.pickupBurst(item.x, item.y, COLOR.dust);
        Sfx.play("pickupDust");
      } else if (item.kind === "heart") {
        this.player.heal(1);
        this.events.emit("hp", this.player.hp);
        this.juice.pickupBurst(item.x, item.y, COLOR.heart);
        Sfx.play("pickupHeart");
      }
      item.destroy();
    });

    // 玩家 vs 敌人
    this.physics.add.overlap(this.player, this.enemies.group, (_p, e) => {
      const k = e as Kobold;
      if (!k.alive) return;
      // Bash 抓取期间玩家正贴在敌人身上，不算接触
      if (this.player.controller.stateName === "Bash") return;
      // 从上方踩：消灭敌人 + 反弹
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
      const kBody = k.body as Phaser.Physics.Arcade.Body;
      if (playerBody.velocity.y > 50 && this.player.y < k.y - 6) {
        k.defeat();
        playerBody.velocity.y = -320;
        this.dustScore += 3;
        this.events.emit("dust", this.dustScore);
        this.juice.pickupBurst(k.x, k.y, COLOR.kobold);
        this.juice.shake(90, 0.006);
        Sfx.play("bashImpact");
      } else {
        const hit = this.player.takeHit(kBody.position.x + kBody.halfWidth);
        if (hit) this.events.emit("hp", this.player.hp);
        if (!this.player.alive) this.die();
      }
    });

    // 摄像机
    this.cameras.main.startFollow(this.player, true, RUN.cameraLerp, RUN.cameraLerp);
    this.cameras.main.setLerp(RUN.cameraLerp, RUN.cameraLerp);
    this.cameras.main.setFollowOffset(-RUN.cameraLeadX, 40);
    this.cameras.main.setDeadzone(40, 80);

    // HUD
    this.scene.launch("Hud", { run: this });
    this.events.emit("hp", this.player.hp);
    this.events.emit("distance", 0);
    this.events.emit("dust", 0);

    // M 键静音切换（持久化）
    this.input.keyboard?.on("keydown-M", () => this.toggleMute());

    // Debug
    if (new URLSearchParams(location.search).has("debug")) {
      this.installDebugOverlay();
    }
  }

  private wireFx(): void {
    this.events.on("biome", (b: BiomePalette) => this.lighting.setBiome(b));
    this.events.once("shutdown", () => {
      this.events.off("fx:jump");
      this.events.off("fx:state");
      this.events.off("fx:bashImpact");
      this.events.off("biome");
      this.biome?.destroy();
      this.lighting?.destroy();
      this.physics.world.resume();        // 万一在 hitstop 顿帧期间退出，保证物理恢复
    });
    this.events.on("fx:jump", (p: FxJumpEvent) => {
      Sfx.play(p.kind);
      this.juice.jumpPuff(p.x, p.y);
      this.player.squashJump();
    });
    this.events.on("fx:state", (p: FxStateEvent) => {
      if (
        p.next === "Grounded" &&
        (p.prev === "Airborne" || p.prev === "Dash" || p.prev === "Glide")
      ) {
        if (p.vy > 120) this.player.squashLand(p.vy);
        if (p.vy > 160) this.juice.landPuff(p.x, p.y, p.vy);   // 小跳不扬尘
        if (p.vy > 240) Sfx.play("land");
      } else if (p.next === "Dash") {
        Sfx.play("dash");
      } else if (p.next === "Glide") {
        Sfx.play("glide");
      } else if (p.next === "Bash") {
        Sfx.play("bash");
      } else if (p.next === "Hurt") {
        Sfx.play("hurt");
        this.juice.shake(140, 0.009);
      }
    });
    this.events.on("fx:bashImpact", (p: FxPointEvent) => {
      this.juice.bashImpact(p.x, p.y);
      if (!p.anchor) this.juice.hitstop(55);   // 锚点链不顿帧，保持流畅
      Sfx.play(p.anchor ? "bash" : "bashImpact");
    });
  }

  private toggleMute(): void {
    const s = load();
    if (s.settings.sfxVolume > 0) {
      this.mutedVolume = s.settings.sfxVolume;
      s.settings.sfxVolume = 0;
    } else {
      s.settings.sfxVolume = this.mutedVolume || 0.8;
    }
    save(s);
    Sfx.setVolume(s.settings.sfxVolume);
    this.showToast(s.settings.sfxVolume > 0 ? "♪ sound on" : "♪ muted");
  }

  private showToast(msg: string): void {
    const t = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 60, msg, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#eae6d5",
        backgroundColor: "rgba(11,10,20,0.6)",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(120);
    this.tweens.add({
      targets: t,
      alpha: { from: 1, to: 0 },
      duration: 900,
      ease: "Quad.easeIn",
      onComplete: () => t.destroy(),
    });
  }

  override update(time: number, delta: number): void {
    if (this.dead) return;

    // 玩家可 Bash 目标：所有活的敌人 + 可用的悬浮锚点
    this.player.bashCandidates = [];
    this.enemies.group.children.iterate((c) => {
      const k = c as Kobold;
      if (k.active && k.alive) {
        this.player.bashCandidates.push({
          obj: k as unknown as Phaser.GameObjects.GameObject & {
            x: number;
            y: number;
            body?: Phaser.Physics.Arcade.Body | null;
          },
        });
      }
      return true;
    });
    this.anchors.group.children.iterate((c) => {
      const a = c as AnchorSprite;
      if (a.active && a.available) {
        this.player.bashCandidates.push({
          obj: a as unknown as Phaser.GameObjects.GameObject & {
            x: number;
            y: number;
            body?: Phaser.Physics.Arcade.Body | null;
            isAnchor?: boolean;
            onBashed?: () => void;
          },
        });
      }
      return true;
    });

    this.player.update(time, delta);
    this.enemies.update();
    this.pickups.update(time);
    this.anchors.update(time);

    // 冲刺残影
    if (this.player.controller.stateName === "Dash") {
      this.juice.dashGhost(this.player);
    }

    // 火焰光圈跟随
    this.lighting.update(this.player.x, this.player.y, time);

    // 生成 / 卸载
    const camRight = this.cameras.main.scrollX + GAME_WIDTH + GAME_WIDTH; // 前方 1 屏 buffer
    const camLeft = this.cameras.main.scrollX - GAME_WIDTH;
    const targetTileX = Math.ceil(camRight / TILE);
    const leftTileX = Math.floor(camLeft / TILE);
    const newChunks = this.generator.ensureUpTo(targetTileX);
    for (const p of newChunks) {
      this.terrain.buildChunk(p, this.biome.tintFor(p.originTileX));
      this.pickups.buildChunk(p);
      this.enemies.buildChunk(p);
      this.anchors.buildChunk(p);
    }
    const removed = this.generator.unloadBefore(leftTileX);
    for (const p of removed) {
      this.terrain.unloadChunk(p);
      this.pickups.unloadChunk(p);
      this.enemies.unloadChunk(p);
      this.anchors.unloadChunk(p);
    }

    // 距离推进
    const currentTileX = Math.floor(this.player.x / TILE);
    const reached = Math.max(0, currentTileX - this.startTileX);
    if (reached > this.maxDistanceTiles) {
      this.maxDistanceTiles = reached;
      this.events.emit("distance", reached);
      this.biome.update(reached);
    }

    // 摔死
    if (this.player.y > RUN.deathFallY) {
      this.player.alive = false;
      this.player.hp = 0;
      this.die();
    }

    // 视差刷新
    if (this.bgMid) this.bgMid.tilePositionX = this.cameras.main.scrollX * 0.35;
  }

  private die(): void {
    if (this.dead) return;
    this.dead = true;
    this.juice.shake(280, 0.012);
    this.juice.flash(180, 196, 69, 48);
    Sfx.play("death");
    this.time.delayedCall(900, () => {
      const result: RunResult = {
        distanceM: this.maxDistanceTiles,
        dustScore: this.dustScore,
        totalScore: this.maxDistanceTiles + Math.floor(this.dustScore * SCORE.dustValue * 2),
        seed: this.seed,
      };
      this.scene.stop("Hud");
      this.scene.start("Death", result);
    });
  }

  private installDebugOverlay(): void {
    const text = this.add
      .text(8, 8, "", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#7be0d6",
        backgroundColor: "rgba(0,0,0,0.4)",
        padding: { x: 4, y: 2 },
      })
      .setScrollFactor(0)
      .setDepth(100);
    this.events.on("update", () => {
      if (!this.player) return;
      const b = this.player.body as Phaser.Physics.Arcade.Body;
      text.setText(
        [
          `state: ${this.player.controller.stateName}`,
          `vx: ${b.velocity.x.toFixed(0)}  vy: ${b.velocity.y.toFixed(0)}`,
          `blocked  L:${b.blocked.left ? 1 : 0} R:${b.blocked.right ? 1 : 0} D:${b.blocked.down ? 1 : 0}`,
          `hp: ${this.player.hp}  iframes: ${this.player.iframesLeft}`,
          `dist: ${this.maxDistanceTiles}m  dust: ${this.dustScore}`,
          `seed: ${this.seed.toString(36)}`,
        ].join("\n"),
      );
    });
  }
}
