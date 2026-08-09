import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('http://localhost:8099/?debug=1', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
await p.evaluate(async () => {
  const { SpriteBank, drawUnit } = await import('/js/gfx/sprite.js');
  const { MONSTERS } = await import('/js/gfx/sprites-units.js');
  const bank = new SpriteBank(2);
  document.body.innerHTML = '';
  const c = document.createElement('canvas');
  c.width = 1400 * 2; c.height = 900 * 2;
  c.style.cssText = 'width:1400px;height:900px;position:fixed;inset:0';
  document.body.append(c);
  const ctx = c.getContext('2d');
  ctx.scale(2, 2);
  const g = ctx.createLinearGradient(0, 0, 0, 900);
  g.addColorStop(0, '#cdeeff'); g.addColorStop(1, '#f2fdf4');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1400, 900);
  const keys = Object.keys(MONSTERS);
  const S = 260;
  keys.forEach((k, i) => {
    const cx = (i % 5) * 280 + 140;
    const cy = Math.floor(i / 5) * 320 + 300;
    drawUnit(ctx, bank.monster(k, 'meadow', S), cx, cy, S);
  });
  // variants of one monster
  ['plain','armored','elite'].forEach((mode, i) => {
    const sp = bank.monster('hornlet', 'keep', S, { armored: mode==='armored', elite: mode==='elite' });
    drawUnit(ctx, sp, 1120 + 0, 300 + i*0, S);
  });
  drawUnit(ctx, bank.monster('blobbie','meadow',S,{armored:true}), 1120, 620, S);
  drawUnit(ctx, bank.monster('flitter','keep',S,{elite:true}), 1330, 620, S);
  ctx.fillStyle = '#3d2447'; ctx.font = '700 16px system-ui'; ctx.textAlign='center';
  keys.forEach((k,i)=>ctx.fillText(MONSTERS[k].name, (i%5)*280+140, Math.floor(i/5)*320+325));
  ctx.fillText('armored', 1120, 645); ctx.fillText('elite (dusk palette)', 1330, 645);
});
await p.waitForTimeout(400);
await p.screenshot({ path: '/tmp/mmd-shots/art-big.png' });
await b.close();
