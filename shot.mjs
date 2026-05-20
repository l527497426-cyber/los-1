import puppeteer from 'puppeteer';

const URL = process.env.URL || 'http://localhost:5174/';
const OUT = process.env.OUT || '/tmp/shot.png';
const WAIT = Number(process.env.WAIT || 1800);

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 540 });
const logs = [];
page.on('console', (m) => logs.push('LOG: ' + m.text()));
page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise((r) => setTimeout(r, 1000));
await page.keyboard.press('Space');         // menu -> run
await new Promise((r) => setTimeout(r, 700));
// optional short travel via right taps (avoid falling into gaps -> death)
const travel = Number(process.env.TRAVEL || 0);
const t0 = Date.now();
while (Date.now() - t0 < travel) {
  await page.keyboard.down('ArrowRight');
  await new Promise((r) => setTimeout(r, 180));
  await page.keyboard.up('ArrowRight');
  await new Promise((r) => setTimeout(r, 120));
}
await new Promise((r) => setTimeout(r, WAIT));

await page.screenshot({ path: OUT });
console.log('shot ->', OUT);
console.log(logs.slice(-12).join('\n') || '(no logs)');
await browser.close();
