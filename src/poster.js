export const WIDTH = 1080;
export const HEIGHT = 1350;
const W = 1080, H = 1350;
const ORANGE = '#ff682e';

function text(ctx, value, x, top, font, color, maxWidth) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.direction = /[\u0590-\u05ff]/.test(value) ? 'rtl' : 'ltr';
  const metrics = ctx.measureText(value);
  const ascent = metrics.actualBoundingBoxAscent || parseInt(font) * .75;
  ctx.fillText(value, x, top + ascent, maxWidth);
}

function defaultBrand(ctx) {
  ctx.save();
  ctx.translate(53, 73); ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 10; ctx.strokeRect(-22, -22, 44, 44);
  ctx.strokeStyle = ORANGE; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(-24, 1); ctx.lineTo(-24, 26); ctx.lineTo(26, 26); ctx.lineTo(26, -24); ctx.lineTo(1, -24); ctx.stroke();
  ctx.restore();
  text(ctx, 'SPORTS TECH', 98, 46, '700 26px Heebo', '#fff', 215);
  text(ctx, 'NATION 2026', 98, 74, '700 26px Heebo', '#fff', 215);
  text(ctx, 'GARMIN', 814, 51, '700 42px Heebo', '#fff', 215);
}

function defaultHeadline(ctx) {
  const lines = ['ON THE WAY', 'TO SPORTS', 'TECH NATION', 'STOPPING'];
  lines.forEach((line, i) => text(ctx, line, 495, 183 + i * 127, '138px Anton', '#fff', 487));
  text(ctx, 'AT', 495, 691, '138px Anton', '#fff', 112);
  text(ctx, 'GARMIN', 614, 691, '138px Anton', ORANGE, 343);
  text(ctx, 'Join me', 495, 1143, '700 78px "Barlow Condensed"', ORANGE, 268);
  text(ctx, '⟶', 724, 1164, '56px sans-serif', '#fff', 70);
  text(ctx, 'www.sportstechnation.com', 498, 1223, '400 24px Heebo', '#86868b', 480);
}

function placeholder(ctx) {
  ctx.save();
  ctx.translate(0, 0);
  const gradient = ctx.createLinearGradient(0, 310, 625, 1280);
  gradient.addColorStop(0, '#35271f'); gradient.addColorStop(.45, '#1a222b'); gradient.addColorStop(1, '#080c12');
  ctx.fillStyle = gradient;
  ctx.shadowColor = '#ff682e90'; ctx.shadowBlur = 22; ctx.shadowOffsetX = 5;
  ctx.beginPath();
  ctx.moveTo(-85, H); ctx.lineTo(-85, 868);
  ctx.quadraticCurveTo(-20, 774, 171, 719);
  ctx.lineTo(201, 651); ctx.quadraticCurveTo(144, 610, 148, 512);
  ctx.bezierCurveTo(104, 492, 118, 451, 145, 457);
  ctx.bezierCurveTo(117, 286, 366, 251, 386, 446);
  ctx.bezierCurveTo(410, 451, 416, 500, 390, 515);
  ctx.quadraticCurveTo(388, 612, 331, 651); ctx.lineTo(357, 719);
  ctx.quadraticCurveTo(594, 764, 653, 865);
  ctx.quadraticCurveTo(686, 968, 576, H); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = '#ffffff0b'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(201, 724); ctx.lineTo(267, 990); ctx.lineTo(356, 721); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(27, 1060); ctx.quadraticCurveTo(332, 1182, 548, 993); ctx.stroke();
  ctx.restore();
}

function portrait(ctx, state) {
  const image = state.portrait;
  if (!image) { placeholder(ctx); return; }
  const h = 1120 * state.scale;
  const w = h * image.width / image.height;
  const x = 290 - w / 2 + state.x;
  const y = H - h + state.y;
  if (state.rim > 0 && state.cutout) {
    ctx.save();
    ctx.shadowColor = `rgba(255,104,46,${state.rim / 100})`;
    ctx.shadowBlur = 12; ctx.shadowOffsetX = 7; ctx.shadowOffsetY = -4;
    ctx.drawImage(image, x, y, w, h);
    ctx.restore();
  }
  ctx.drawImage(image, x, y, w, h);
  const gradient = ctx.createLinearGradient(0, H - 190, 0, H);
  gradient.addColorStop(0, 'transparent'); gradient.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = gradient; ctx.fillRect(0, H - 190, 670, 190);
}

export function renderPoster(canvas, state) {
  canvas.width = WIDTH; canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  ctx.scale(WIDTH / W, HEIGHT / H);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (state.background) ctx.drawImage(state.background, 0, 0, W, H);
  else if (!state.foreground) defaultBrand(ctx);
  portrait(ctx, state);
  if (state.foreground) ctx.drawImage(state.foreground, 0, 0, W, H);
  else defaultHeadline(ctx);
  const name = state.name.trim() || 'Your Name';
  const title = state.title.trim() || 'Your Title';
  if (!state.foreground) { ctx.fillStyle = ORANGE; ctx.fillRect(499, 930, 94, 5); }
  text(ctx, name, 497, 973, '700 68px "Barlow Condensed", Heebo', '#fff', 520);
  text(ctx, title, 497, 1048, '400 39px "Barlow Condensed", Heebo', ORANGE, 500);
}
