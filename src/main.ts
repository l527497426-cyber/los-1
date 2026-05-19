import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLOR } from "./config";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { RunScene } from "./scenes/RunScene";
import { HudScene } from "./scenes/HudScene";
import { DeathScene } from "./scenes/DeathScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: COLOR.bgSky,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 4,
    touch: { capture: true },
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },   // 玩家自己接管重力
      debug: new URLSearchParams(location.search).has("phys"),
    },
  },
  scene: [BootScene, MenuScene, RunScene, HudScene, DeathScene],
  render: {
    antialias: false,
    powerPreference: "high-performance",
  },
};

new Phaser.Game(config);

const boot = document.getElementById("boot");
if (boot) boot.remove();
