// Cinderfall's canvas rendering: the title screen, the duel table with both
// hands and Life plates, the clash reveal, and the win and loss screens.
// Everything is drawn with paths and gradients — no images, no fonts to load.

import { MAX_GUARD, START_LIFE, cardLabel, suitOf } from './cards.js';
import { SIDE_PLAYER } from './duel.js';

export const WIDTH = 1280;
export const HEIGHT = 800;

export const SCREEN_TITLE = 'title';
export const SCREEN_TABLE = 'table';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSE = 'lose';

const INK = '#171208';
const PARCHMENT = '#f3e9d2';
const GOLD = '#e8b34b';
const ASH = '#9a8f7d';

// Fixed ember motes drifting over the table, from a tiny local generator so
// every frame of a scene agrees with itself.
const MOTES = (() => {
  let s = 4242;
  const next = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  return Array.from({ length: 46 }, () => ({ x: next(), y: next(), r: 1 + next() * 2.2, a: 0.12 + next() * 0.3 }));
})();

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, value, x, y, font, colour, align = 'center') {
  ctx.font = font;
  ctx.fillStyle = colour;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

/** The Ashen Crown: three points over a band, drawn as one gold path. */
export function drawCrown(ctx, cx, cy, w, colour = GOLD) {
  const h = w * 0.62;
  const top = cy - h / 2;
  const base = cy + h / 2;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, base);
  ctx.lineTo(cx - w / 2, top + h * 0.38);
  ctx.lineTo(cx - w * 0.27, top + h * 0.62);
  ctx.lineTo(cx, top);
  ctx.lineTo(cx + w * 0.27, top + h * 0.62);
  ctx.lineTo(cx + w / 2, top + h * 0.38);
  ctx.lineTo(cx + w / 2, base);
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.fillRect(cx - w / 2, base + h * 0.08, w, h * 0.16);
  ctx.beginPath();
  ctx.arc(cx, top + h * 0.1, w * 0.045, 0, Math.PI * 2);
  ctx.arc(cx - w * 0.38, top + h * 0.44, w * 0.04, 0, Math.PI * 2);
  ctx.arc(cx + w * 0.38, top + h * 0.44, w * 0.04, 0, Math.PI * 2);
  ctx.fillStyle = '#fff3d6';
  ctx.fill();
}

/** One suit's glyph, drawn by shape in its own colour at (cx, cy) within radius r. */
export function drawSuitGlyph(ctx, suitId, cx, cy, r, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  if (suitId === 'ember') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.bezierCurveTo(cx + r * 0.85, cy - r * 0.05, cx + r * 0.6, cy + r * 0.5, cx, cy + r * 0.95);
    ctx.bezierCurveTo(cx - r * 0.6, cy + r * 0.5, cx - r * 0.85, cy - r * 0.05, cx, cy - r);
    ctx.fill();
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.25);
    ctx.bezierCurveTo(cx + r * 0.45, cy + r * 0.2, cx + r * 0.3, cy + r * 0.55, cx, cy + r * 0.9);
    ctx.bezierCurveTo(cx - r * 0.3, cy + r * 0.55, cx - r * 0.45, cy + r * 0.2, cx, cy - r * 0.25);
    ctx.fill();
  } else if (suitId === 'tide') {
    ctx.lineWidth = r * 0.24;
    ctx.lineCap = 'round';
    for (const lift of [-0.42, 0.38]) {
      ctx.beginPath();
      for (let x = -r; x <= r; x += r / 8) {
        const y = cy + lift * r + Math.sin((x / r) * Math.PI) * r * 0.26 * (lift < 0 ? 1 : -1);
        if (x === -r) ctx.moveTo(cx + x, y);
        else ctx.lineTo(cx + x, y);
      }
      ctx.stroke();
    }
  } else if (suitId === 'thorn') {
    for (const dx of [-0.58, 0, 0.58]) {
      const height = r * (1.05 - Math.abs(dx) * 0.35);
      ctx.beginPath();
      ctx.moveTo(cx + dx * r - r * 0.17, cy + r * 0.85);
      ctx.lineTo(cx + dx * r + r * 0.05, cy - height);
      ctx.lineTo(cx + dx * r + r * 0.27, cy + r * 0.85);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.88, r * 0.95, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Gloam: a crescent moon and its star.
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.92, Math.PI * 0.32, Math.PI * 1.68);
    ctx.arc(cx + r * 0.48, cy - r * 0.18, r * 0.74, Math.PI * 1.52, Math.PI * 0.48, true);
    ctx.closePath();
    ctx.fill();
    const sx = cx + r * 0.52;
    const sy = cy - r * 0.58;
    ctx.beginPath();
    ctx.moveTo(sx, sy - r * 0.3);
    ctx.lineTo(sx + r * 0.09, sy - r * 0.09);
    ctx.lineTo(sx + r * 0.3, sy);
    ctx.lineTo(sx + r * 0.09, sy + r * 0.09);
    ctx.lineTo(sx, sy + r * 0.3);
    ctx.lineTo(sx - r * 0.09, sy + r * 0.09);
    ctx.lineTo(sx - r * 0.3, sy);
    ctx.lineTo(sx - r * 0.09, sy - r * 0.09);
    ctx.closePath();
    ctx.fillStyle = '#e9d8ff';
    ctx.fill();
  }
  ctx.restore();
}

/** A small shield, for Guard pips. */
function drawShield(ctx, cx, cy, r, colour) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r * 0.85, cy - r * 0.62);
  ctx.lineTo(cx + r * 0.85, cy + r * 0.15);
  ctx.quadraticCurveTo(cx + r * 0.85, cy + r * 0.8, cx, cy + r);
  ctx.quadraticCurveTo(cx - r * 0.85, cy + r * 0.8, cx - r * 0.85, cy + r * 0.15);
  ctx.lineTo(cx - r * 0.85, cy - r * 0.62);
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
}

/**
 * One card at (x, y, w, h). Face-up cards show power, glyph and suit name on
 * parchment with a suit-coloured frame; `streak` adds the +1 badge a repeated
 * suit earns. Face-down cards carry the Crown on ash-black.
 */
export function drawCard(ctx, x, y, w, h, card, options = {}) {
  const { faceUp = true, streak = false, dim = false } = options;
  ctx.save();
  if (dim) ctx.globalAlpha = 0.55;
  roundRect(ctx, x, y, w, h, w * 0.09);
  if (!faceUp) {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#2b2118');
    grad.addColorStop(1, '#171208');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = Math.max(2, w * 0.03);
    ctx.strokeStyle = '#8a6a2f';
    ctx.stroke();
    drawCrown(ctx, x + w / 2, y + h / 2, w * 0.52, '#a87f35');
    ctx.restore();
    return;
  }
  const suit = suitOf(card.suit);
  ctx.fillStyle = PARCHMENT;
  ctx.fill();
  ctx.lineWidth = Math.max(2, w * 0.035);
  ctx.strokeStyle = suit.colour;
  ctx.stroke();
  roundRect(ctx, x, y, w, h * 0.2, w * 0.09);
  ctx.fillStyle = suit.colour;
  ctx.fill();
  text(ctx, String(card.power), x + w * 0.2, y + h * 0.1 + 2, `700 ${Math.round(h * 0.13)}px Georgia, serif`, '#ffffff', 'center');
  text(ctx, suit.name.toUpperCase(), x + w * 0.62, y + h * 0.1 + 2, `700 ${Math.round(h * 0.075)}px Georgia, serif`, '#ffffff', 'center');
  drawSuitGlyph(ctx, card.suit, x + w / 2, y + h * 0.52, w * 0.3, suit.colour);
  text(ctx, suit.giftName, x + w / 2, y + h * 0.86, `italic ${Math.round(h * 0.075)}px Georgia, serif`, INK, 'center');
  if (streak) {
    ctx.beginPath();
    ctx.arc(x + w * 0.88, y + h * 0.3, w * 0.13, 0, Math.PI * 2);
    ctx.fillStyle = '#e4572e';
    ctx.fill();
    text(ctx, '+1', x + w * 0.88, y + h * 0.3 + 1, `700 ${Math.round(h * 0.085)}px Georgia, serif`, '#ffffff', 'center');
  }
  ctx.restore();
}

/** The ashen table itself: gradient, glow and drifting motes. */
function drawTableSurface(ctx) {
  const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  grad.addColorStop(0, '#131009');
  grad.addColorStop(0.55, '#1d150e');
  grad.addColorStop(1, '#120d08');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const glow = ctx.createRadialGradient(WIDTH / 2, HEIGHT * 0.46, 60, WIDTH / 2, HEIGHT * 0.46, 560);
  glow.addColorStop(0, 'rgba(232, 179, 75, 0.14)');
  glow.addColorStop(1, 'rgba(232, 179, 75, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  for (const mote of MOTES) {
    ctx.beginPath();
    ctx.arc(mote.x * WIDTH, mote.y * HEIGHT, mote.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 166, 66, ${mote.a})`;
    ctx.fill();
  }
}

/** A duelist's plate: name, Life bar with its number, Guard shields, deck count. */
function drawPlate(ctx, x, y, w, title, life, guard, deckCount, colour) {
  ctx.save();
  roundRect(ctx, x, y, w, 74, 10);
  ctx.fillStyle = 'rgba(10, 8, 5, 0.72)';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = colour;
  ctx.stroke();
  text(ctx, title, x + 12, y + 16, '700 15px Georgia, serif', colour, 'left');
  text(ctx, `${Math.max(0, life)} / ${START_LIFE}`, x + w - 12, y + 16, '700 15px Georgia, serif', PARCHMENT, 'right');
  roundRect(ctx, x + 12, y + 30, w - 24, 12, 6);
  ctx.fillStyle = '#3a2c1c';
  ctx.fill();
  const frac = Math.max(0, life) / START_LIFE;
  if (frac > 0) {
    roundRect(ctx, x + 12, y + 30, (w - 24) * frac, 12, 6);
    ctx.fillStyle = life <= 6 ? '#d33f2e' : '#c98a2d';
    ctx.fill();
  }
  for (let i = 0; i < MAX_GUARD; i += 1) {
    drawShield(ctx, x + 18 + i * 18, y + 58, 7, i < guard ? '#7fb2e5' : 'rgba(127, 178, 229, 0.18)');
  }
  text(ctx, `Guard`, x + 132, y + 58, '12px Georgia, serif', ASH, 'left');
  text(ctx, `Deck ${deckCount}`, x + w - 12, y + 58, '12px Georgia, serif', ASH, 'right');
  ctx.restore();
}

/** The score line the whole duel is read by: clash count and damage both ways. */
export function scoreLine(state) {
  return `Clash ${state.clashes}  ·  Damage dealt ${state.playerDamage}  ·  Damage taken ${state.wardenDamage}`;
}

/** Rectangles of the player's hand along the bottom, in hand order. */
export function playerHandLayout(count) {
  const cardW = 116;
  const cardH = 162;
  const gap = 14;
  const total = count * cardW + (count - 1) * gap;
  return Array.from({ length: count }, (_, i) => ({
    x: (WIDTH - total) / 2 + i * (cardW + gap),
    y: HEIGHT - cardH - 42,
    w: cardW,
    h: cardH,
  }));
}

/** Rectangles of the Warden's card backs across the top, in hand order. */
export function wardenHandLayout(count) {
  const cardW = 84;
  const cardH = 118;
  const gap = 10;
  const total = count * cardW + (count - 1) * gap;
  return Array.from({ length: count }, (_, i) => ({
    x: (WIDTH - total) / 2 + i * (cardW + gap),
    y: 46,
    w: cardW,
    h: cardH,
  }));
}

/**
 * The duel table. `view` carries the live state plus what the player is doing:
 * hoverIndex (card under the pointer), reveal (a settled clash to show in the
 * centre, with revealT 0..1 of its entrance) and message (the prompt line).
 */
export function drawTable(ctx, state, view = {}) {
  const { hoverIndex = -1, reveal = null, revealT = 1, message = '' } = view;
  drawTableSurface(ctx);
  text(ctx, scoreLine(state), WIDTH / 2, 24, '600 16px Georgia, serif', ASH);

  drawPlate(ctx, 18, 44, 252, 'THE WARDEN', state.wardenLife, state.wardenGuard, state.wardenDeck.length, '#c96a4a');
  // The Warden's hand: card backs in a row across the top.
  wardenHandLayout(state.wardenHand.length).forEach((rect, i) => {
    drawCard(ctx, rect.x, rect.y, rect.w, rect.h, state.wardenHand[i], { faceUp: false });
  });
  drawPlate(ctx, WIDTH - 270, 44, 252, 'YOU', state.playerLife, state.playerGuard, state.playerDeck.length, GOLD);

  // The centre: a settled clash revealed, or the Crown waiting.
  if (reveal) {
    const cardW = 150;
    const cardH = 210;
    const cy = 238;
    const slide = (1 - revealT) * 60;
    drawCard(ctx, WIDTH / 2 - cardW - 26, cy + slide * 0.4, cardW, cardH, reveal.wardenCard, {
      streak: reveal.wardenPower > reveal.wardenCard.power,
    });
    drawCard(ctx, WIDTH / 2 + 26, cy - slide * 0.4, cardW, cardH, reveal.playerCard, {
      streak: reveal.playerPower > reveal.playerCard.power,
    });
    text(ctx, `${reveal.wardenPower}`, WIDTH / 2 - cardW - 26 + cardW / 2, cy - 24, '700 26px Georgia, serif', '#c96a4a');
    ctx.beginPath();
    ctx.arc(WIDTH / 2, cy + cardH / 2, 25, 0, Math.PI * 2);
    ctx.fillStyle = '#241a10';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = GOLD;
    ctx.stroke();
    text(ctx, 'VS', WIDTH / 2, cy + cardH / 2 + 1, '700 19px Georgia, serif', GOLD);
    text(ctx, `${reveal.playerPower}`, WIDTH / 2 + 26 + cardW / 2, cy - 24, '700 26px Georgia, serif', GOLD);
    const headline =
      reveal.outcome === 'tie'
        ? 'A dead-even clash'
        : reveal.outcome === SIDE_PLAYER
          ? `Your ${cardLabel(reveal.playerCard)} takes the clash`
          : `The Warden's ${cardLabel(reveal.wardenCard)} takes the clash`;
    text(ctx, headline, WIDTH / 2, cy + cardH + 30, '700 22px Georgia, serif', PARCHMENT);
    reveal.events.slice(0, 2).forEach((line, i) => {
      text(ctx, line, WIDTH / 2, cy + cardH + 60 + i * 24, '15px Georgia, serif', ASH);
    });
  } else {
    ctx.save();
    ctx.globalAlpha = 0.5;
    drawCrown(ctx, WIDTH / 2, 330, 120, '#8a6a2f');
    ctx.restore();
    text(ctx, message || 'Choose a card to strike.', WIDTH / 2, 428, '600 20px Georgia, serif', PARCHMENT);
    text(ctx, 'Higher power wounds by the margin · a tie singes both · the winner’s suit gift fires.', WIDTH / 2, 458, '14px Georgia, serif', ASH);
  }

  // The player's hand along the bottom, the hovered card lifted.
  playerHandLayout(state.playerHand.length).forEach((rect, i) => {
    const y = rect.y - (i === hoverIndex ? 18 : 0);
    drawCard(ctx, rect.x, y, rect.w, rect.h, state.playerHand[i], { streak: state.playerLastSuit === state.playerHand[i].suit });
  });
  text(ctx, 'Click a card — or press 1–5 — to commit it to the clash.', WIDTH / 2, HEIGHT - 18, '13px Georgia, serif', ASH);
}

/** The title screen: crown, name, the rules in brief, and the call to begin. */
export function drawTitle(ctx) {
  drawTableSurface(ctx);
  drawCrown(ctx, WIDTH / 2, 218, 190);
  text(ctx, 'CINDERFALL', WIDTH / 2, 368, '700 84px Georgia, serif', PARCHMENT);
  text(ctx, 'Duel for the Ashen Crown', WIDTH / 2, 424, 'italic 30px Georgia, serif', GOLD);
  const rules = [
    'Both duelists hold five cards and 20 Life. Each clash, both commit one card.',
    'Higher power wounds by the margin — Guard soaks first. A tie singes both for 1.',
    'The winner’s gift fires: Ember burns through Guard, Tide heals, Thorn guards, Gloam draws.',
    'Repeat a suit for +1 streak power. Empty the Warden’s Life to take the Crown.',
  ];
  rules.forEach((line, i) => text(ctx, line, WIDTH / 2, 486 + i * 28, '17px Georgia, serif', '#cfc4ab'));
  text(ctx, 'Click or press Enter to duel', WIDTH / 2, 640, '700 22px Georgia, serif', GOLD);
  text(ctx, 'The Warden reads your recent ranks — vary your strikes, or be answered cheaply.', WIDTH / 2, 690, 'italic 15px Georgia, serif', ASH);
}

/** The end screen, won or lost: the Crown taken or kept, and the duel's tally. */
export function drawEnd(ctx, state, won) {
  drawTableSurface(ctx);
  if (won) {
    drawCrown(ctx, WIDTH / 2, 240, 210);
    text(ctx, 'THE CROWN IS YOURS', WIDTH / 2, 396, '700 58px Georgia, serif', GOLD);
    text(ctx, 'The Warden kneels in the ash. Cinderfall has a new keeper.', WIDTH / 2, 452, 'italic 22px Georgia, serif', PARCHMENT);
  } else {
    ctx.save();
    ctx.globalAlpha = 0.45;
    drawCrown(ctx, WIDTH / 2, 240, 210, '#6b5836');
    ctx.restore();
    text(ctx, 'THE ASHES CLAIM YOU', WIDTH / 2, 396, '700 58px Georgia, serif', '#c96a4a');
    text(ctx, 'The Warden keeps the Ashen Crown — this time.', WIDTH / 2, 452, 'italic 22px Georgia, serif', PARCHMENT);
  }
  text(ctx, scoreLine(state), WIDTH / 2, 522, '600 20px Georgia, serif', '#cfc4ab');
  text(
    ctx,
    `Final Life — you ${Math.max(0, state.playerLife)}, the Warden ${Math.max(0, state.wardenLife)}`,
    WIDTH / 2,
    556,
    '17px Georgia, serif',
    ASH,
  );
  text(ctx, 'Click or press Enter to duel again', WIDTH / 2, 640, '700 22px Georgia, serif', GOLD);
}
