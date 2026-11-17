import type { Area } from '../domain/types';
import { fmt } from '../lib/format';

/** Animated stand-in for a real clip: a pitch every 2.4 s, behaviour depends on skill area. */
export function drawDemo(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, area: Area) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1d2a35'); g.addColorStop(0.55, '#2a3640'); g.addColorStop(0.56, '#5b4433'); g.addColorStop(1, '#3e2e22');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
  for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo((w * i) / 8, h * 0.56); ctx.lineTo(w * (i / 8 - 0.5) * 2.4 + w / 2, h); ctx.stroke(); }

  const P = 2.4, k = Math.floor(t / P), p = t - k * P;
  let s = k * 97 + 13;
  const lr = () => (s = (s * 48271) % 2147483647) / 2147483647;
  const ox = (lr() - 0.5) * 0.16 * w, oy = (lr() - 0.5) * 0.12 * h;
  const cx = w * 0.5, base = h * 0.9;
  const drop = area === 'Blocking' ? Math.min(1, Math.max(0, (p - 0.18) / 0.22)) : 0;

  // plate
  ctx.fillStyle = '#e9e6dc'; ctx.beginPath();
  const pw = w * 0.08, py = h * 0.7;
  ctx.moveTo(cx - pw, py); ctx.lineTo(cx + pw, py); ctx.lineTo(cx + pw, py + h * 0.025); ctx.lineTo(cx, py + h * 0.05); ctx.lineTo(cx - pw, py + h * 0.025); ctx.closePath(); ctx.fill();

  // catcher
  const bodyTop = h * (0.5 + 0.1 * drop), bodyW = w * (0.12 + 0.03 * drop);
  ctx.fillStyle = '#1e3a52'; ctx.beginPath(); ctx.roundRect(cx - bodyW / 2, bodyTop, bodyW, base - bodyTop, 18); ctx.fill();
  ctx.fillStyle = '#2b2f36'; ctx.beginPath(); ctx.arc(cx, bodyTop - h * 0.045, h * 0.055, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(160,190,210,.35)'; ctx.fillRect(cx - h * 0.04, bodyTop - h * 0.07, h * 0.08, h * 0.04);

  // glove
  const catchT = 0.45;
  let gx = cx + ox * 0.9 + w * 0.03, gy = h * 0.56 + oy;
  if (area === 'Blocking') { gx = cx; gy = h * (0.6 + 0.22 * drop); }
  if (area === 'Throwing' && p > catchT) { const q = Math.min(1, (p - catchT) / 0.7); gx += (cx + w * 0.09 - gx) * q; gy += (h * 0.42 - gy) * q; }
  if (area === 'Receiving' && p > catchT && k % 2 === 1) gx += Math.min(1, (p - catchT) / 0.4) * w * 0.04;
  ctx.fillStyle = '#8a5a2b'; ctx.beginPath(); ctx.ellipse(gx, gy, w * 0.035, h * 0.065, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#5e3c1c'; ctx.lineWidth = 2; ctx.stroke();

  // ball
  let bx = 0, by = 0, br = 0, show = true;
  const sx = w * 0.5, sy = h * 0.2;
  if (p < catchT) {
    const q = p / catchT;
    if (area === 'Blocking') {
      const land = 0.7, hx = cx + ox * 0.5, hy = h * 0.86;
      if (q < land) { const r = q / land; bx = sx + (hx - sx) * r; by = sy + (hy - sy) * r * r; }
      else { const r = (q - land) / (1 - land); bx = hx; by = hy - Math.sin(r * Math.PI) * h * 0.05; }
      br = h * (0.008 + 0.02 * q);
    } else { bx = sx + (gx - sx) * q; by = sy + (gy - sy) * q * q; br = h * (0.006 + 0.022 * q); }
  } else if (area === 'Throwing' && p > 1.2 && p < 2.0) {
    const q = (p - 1.2) / 0.8; bx = gx + (w * 0.5 - gx) * q; by = gy - (gy - h * 0.05) * q; br = h * 0.02 * (1 - q * 0.8);
  } else if (area === 'Blocking') { bx = cx + ox * 0.4; by = h * 0.87; br = h * 0.028; }
  else show = false;
  if (show) { ctx.fillStyle = '#f7f5ee'; ctx.beginPath(); ctx.arc(bx, by, br, 0, 7); ctx.fill(); }

  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = `${Math.round(h * 0.035)}px "DM Mono",monospace`;
  ctx.textAlign = 'right'; ctx.fillText(fmt(t), w - 12, h - 12);
}
