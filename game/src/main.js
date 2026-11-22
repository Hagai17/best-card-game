// Cinderfall's browser glue: the canvas, pointer and keyboard input, the
// title → aim → reveal → end flow, and the ?shot= staging the screenshots
// are taken from. All rules live in duel.js; all drawing in render.js.

import { createDuel, playClash } from './duel.js';
import {
  HEIGHT,
  SCREEN_LOSE,
  SCREEN_TABLE,
  SCREEN_TITLE,
  SCREEN_WIN,
  WIDTH,
  drawEnd,
  drawTable,
  drawTitle,
  playerHandLayout,
} from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const shotSeed = Number(params.get('seed') ?? '1') || 1;

const REVEAL_MS = 1700;
const REVEAL_SLIDE_MS = 380;

let screen = SCREEN_TITLE;
let duel = createDuel((Math.random() * 1e9) | 0);
let hoverIndex = -1;
let reveal = null;
let revealStarted = 0;
let shotScene = null;

if (shotName !== null) {
  shotScene = stageShot(shotName, shotSeed);
  screen = shotScene.screen;
  duel = shotScene.state;
  reveal = shotScene.reveal;
}

function announce(message) {
  if (status) status.textContent = message;
}

function startDuel() {
  duel = createDuel((Math.random() * 1e9) | 0);
  reveal = null;
  hoverIndex = -1;
  screen = SCREEN_TABLE;
  announce('A new duel for the Ashen Crown. Choose a card to strike.');
}

function commit(index) {
  if (screen !== SCREEN_TABLE || reveal !== null) return;
  if (index < 0 || index >= duel.playerHand.length) return;
  const clash = playClash(duel, index);
  reveal = clash;
  revealStarted = performance.now();
  hoverIndex = -1;
  announce(clash.events.join(' '));
}

function settleReveal() {
  reveal = null;
  if (duel.over) {
    screen = duel.winner === 'player' ? SCREEN_WIN : SCREEN_LOSE;
    announce(screen === SCREEN_WIN ? 'You take the Ashen Crown.' : 'The Warden keeps the Ashen Crown.');
  }
}

/** The canvas point under a pointer event, in the game's own coordinates. */
function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
  };
}

function handIndexAt(point) {
  const layout = playerHandLayout(duel.playerHand.length);
  for (let i = 0; i < layout.length; i += 1) {
    const r = layout[i];
    if (point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y - 18 && point.y <= r.y + r.h) return i;
  }
  return -1;
}

canvas.addEventListener('pointermove', (event) => {
  if (shotScene) return;
  hoverIndex = screen === SCREEN_TABLE && reveal === null ? handIndexAt(canvasPoint(event)) : -1;
  canvas.style.cursor = hoverIndex >= 0 ? 'pointer' : 'default';
});

canvas.addEventListener('pointerdown', (event) => {
  if (shotScene) return;
  if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOSE) {
    startDuel();
    return;
  }
  const index = handIndexAt(canvasPoint(event));
  if (index >= 0) commit(index);
});

window.addEventListener('keydown', (event) => {
  if (shotScene) return;
  if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOSE) {
    if (event.key === 'Enter' || event.key === ' ') startDuel();
    return;
  }
  if (screen === SCREEN_TABLE && reveal === null) {
    const digit = Number(event.key);
    if (Number.isInteger(digit) && digit >= 1 && digit <= 5) commit(digit - 1);
  }
});

function frame(now) {
  if (shotScene) {
    if (screen === SCREEN_TITLE) drawTitle(ctx);
    else if (screen === SCREEN_TABLE) drawTable(ctx, duel, { reveal, revealT: 1 });
    else drawEnd(ctx, duel, screen === SCREEN_WIN);
    window.__shotReady = true;
    return;
  }
  if (screen === SCREEN_TITLE) {
    drawTitle(ctx);
  } else if (screen === SCREEN_TABLE) {
    let revealT = 1;
    if (reveal !== null) {
      const elapsed = now - revealStarted;
      revealT = Math.min(1, elapsed / REVEAL_SLIDE_MS);
      if (elapsed >= REVEAL_MS) settleReveal();
    }
    if (screen === SCREEN_TABLE) {
      drawTable(ctx, duel, { hoverIndex, reveal, revealT, message: 'Choose a card to strike.' });
    } else {
      drawEnd(ctx, duel, screen === SCREEN_WIN);
    }
  } else {
    drawEnd(ctx, duel, screen === SCREEN_WIN);
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
