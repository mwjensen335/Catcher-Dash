import type { Note, Shape } from '../domain/types';

/** How long a drawing stays on screen after its moment, in seconds. */
export const DRAW_HOLD = 1.2;
export const CAPTION_HOLD = 2.8;

export const visibleShapes = (shapes: Shape[], t: number) => shapes.filter((d) => t >= d.t - 0.02 && t <= d.t + DRAW_HOLD);
export const activeNote = (notes: Note[], t: number) => [...notes].reverse().find((n) => t >= n.t - 0.02 && t <= n.t + CAPTION_HOLD);

export function drawShape(ctx: CanvasRenderingContext2D, s: Shape, w: number, h: number) {
  const lw = Math.max(2, w * 0.005);
  ctx.save();
  ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 4;
  const P = s.pts.map(([x, y]) => [x * w, y * h] as const);
  if (s.tool === 'pen') { ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
  if (P.length >= 2) {
    const [x1, y1] = P[0];
    const [x2, y2] = P[P.length - 1];
    if (s.tool === 'arrow' || s.tool === 'angle') { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    if (s.tool === 'arrow') {
      const a = Math.atan2(y2 - y1, x2 - x1), L = lw * 5;
      ctx.beginPath(); ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - L * Math.cos(a - 0.45), y2 - L * Math.sin(a - 0.45));
      ctx.lineTo(x2 - L * Math.cos(a + 0.45), y2 - L * Math.sin(a + 0.45));
      ctx.closePath(); ctx.fill();
    }
    if (s.tool === 'circle') { ctx.beginPath(); ctx.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, 7); ctx.stroke(); }
    if (s.tool === 'angle') {
      // dashed horizontal reference + degrees from horizontal (e.g. shin or chest angle)
      ctx.setLineDash([lw * 2, lw * 2]); ctx.beginPath(); ctx.moveTo(x1, y1);
      ctx.lineTo(x1 + Math.sign(x2 - x1 || 1) * Math.hypot(x2 - x1, y2 - y1), y1); ctx.stroke(); ctx.setLineDash([]);
      const deg = Math.abs((Math.atan2(-(y2 - y1), Math.abs(x2 - x1)) * 180) / Math.PI);
      ctx.font = `600 ${Math.round(h * 0.045)}px "DM Mono",monospace`; ctx.textAlign = 'left';
      ctx.fillText(`${deg.toFixed(0)}°`, x1 + 8, y1 - 8);
    }
  }
  ctx.restore();
}

/** Caption burned into recorded reviews (on screen it's an HTML overlay). */
export function drawCaption(ctx: CanvasRenderingContext2D, n: Note, w: number, h: number) {
  const fs = Math.round(h * 0.034);
  ctx.save();
  ctx.font = `500 ${fs}px "DM Sans",sans-serif`;
  const label = n.k === 'good' ? 'GOOD' : n.k === 'fix' ? 'FIX' : n.k === 'voice' ? 'VOICE' : 'NOTE';
  const text = n.text.length > 90 ? n.text.slice(0, 87) + '…' : n.text;
  const lw = ctx.measureText(label).width, tw = ctx.measureText(text).width;
  const pad = fs * 0.6, boxW = Math.min(w * 0.92, lw + tw + pad * 3), boxH = fs * 1.9;
  const x = (w - boxW) / 2, y = h - boxH - h * 0.04;
  ctx.fillStyle = 'rgba(8,12,17,.82)'; ctx.beginPath(); ctx.roundRect(x, y, boxW, boxH, 8); ctx.fill();
  ctx.textBaseline = 'middle';
  ctx.fillStyle = n.k === 'good' ? '#5cc98c' : n.k === 'fix' ? '#ff8f6b' : '#9cc9e8';
  ctx.fillText(label, x + pad, y + boxH / 2);
  ctx.fillStyle = '#f2f6f9'; ctx.fillText(text, x + pad * 2 + lw, y + boxH / 2, boxW - lw - pad * 3);
  ctx.restore();
}
