import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 540 });
const logs = [];
page.on('console', (m) => logs.push('LOG: ' + m.text()));
page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '')));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise((r) => setTimeout(r, 1200));
await page.keyboard.press('Space');
await new Promise((r) => setTimeout(r, 1500));

const info = await page.evaluate(() => {
  const g = window.__game;
  const out = { rendererType: g.renderer.type };
  out.texStone = g.textures.exists('tile_stone');
  if (out.texStone) {
    const img = g.textures.get('tile_stone').getSourceImage();
    out.stoneTexWH = [img.width, img.height];
  }
  const run = g.scene.getScene('Run');
  out.runActive = g.scene.isActive('Run');
  if (run && run.terrain && run.terrain.stones) {
    out.stoneCount = run.terrain.stones.getLength();
    const c = run.terrain.stones.getChildren();
    if (c[0]) {
      const s = c[0];
      out.firstStone = { x: s.x, y: s.y, dispW: s.displayWidth, dispH: s.displayHeight, bodyW: s.body ? s.body.width : null, bodyH: s.body ? s.body.height : null };
    }
  } else {
    out.terrainMissing = true;
  }
  if (run && run.player) {
    out.player = { x: Math.round(run.player.x), y: Math.round(run.player.y), alive: run.player.alive, hp: run.player.hp, state: run.player.controller ? run.player.controller.stateName : '?' };
  }
  return out;
});

console.log('=== STATE ===');
console.log(JSON.stringify(info, null, 2));
console.log('=== CONSOLE / ERRORS ===');
console.log(logs.join('\n') || '(none)');
await browser.close();
