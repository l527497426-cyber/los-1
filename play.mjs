import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--use-gl=swiftshader','--ignore-gpu-blocklist','--enable-webgl'] });
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 540 });
await page.goto('http://localhost:5174/', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r=>setTimeout(r,900));
await page.keyboard.press('Space');                 // start
await new Promise(r=>setTimeout(r,500));
await page.keyboard.down('ArrowRight');              // keep running
let shot = 0;
const stamp = async () => {
  const d = await page.evaluate(()=>{ const r=window.__game.scene.getScene('Run'); return r&&r.player?{m:r.maxDistanceTiles,alive:r.player.alive}:{m:-1,alive:false}; });
  const f = `/tmp/play_${shot}.png`;
  await page.screenshot({ path: f });
  console.log(f, JSON.stringify(d));
  shot++;
};
// run ~8s, jump every ~700ms to clear gaps / climb, snapshot every ~1.6s
const t0 = Date.now();
let lastJump = 0, lastShot = 0;
while (Date.now() - t0 < 9000) {
  const now = Date.now() - t0;
  if (now - lastJump > 650) { await page.keyboard.press('ArrowUp'); lastJump = now; }
  if (now - lastShot > 1700) { await stamp(); lastShot = now; }
  await new Promise(r=>setTimeout(r,80));
}
await page.keyboard.up('ArrowRight');
await browser.close();
