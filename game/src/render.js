// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x720 playfield is scaled to fit the window and centred. Warm
// dumpling-house palette: cream walls, wood counter, bamboo steamers, and
// one bright red lantern accent. Text that holds a number is rebuilt only
// when the number changes, so a frame allocates nothing.
import { FIELD, FONT, LAYOUT, PALETTE, RECIPES, SHIFT, STEAM } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function cachedLabel(prefix) {
  let value = null;
  let text = '';
  return function label(next) {
    if (next !== value) { value = next; text = prefix + next; }
    return text;
  };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const moneyLabel = cachedLabel('💰 $');
  const goalLabel = cachedLabel('Goal $');
  const timeLabel = cachedLabel('');
  const comboLabel = cachedLabel('🔥 x');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.x / (window.devicePixelRatio || 1)) / (view.scale / (window.devicePixelRatio || 1)),
      y: (clientY - rect.top - view.y / (window.devicePixelRatio || 1)) / (view.scale / (window.devicePixelRatio || 1)),
    };
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, weight) {
    const key = size + (weight || '');
    if (!fonts.has(key)) fonts.set(key, `${weight || ''} ${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.fillText(value, x, y);
  }

  function dumplingIcon(cx, cy, r, recipe, perfect) {
    // A hand-drawn dumpling: pale half-moon with a crimped edge.
    context.fillStyle = '#ffe9b8';
    context.strokeStyle = '#d9a05f';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(cx, cy + r * 0.25, r, Math.PI, 0);
    context.closePath();
    context.fill(); context.stroke();
    context.fillStyle = recipe.color;
    context.beginPath();
    context.arc(cx, cy + r * 0.1, r * 0.55, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#b07a45';
    context.lineWidth = 2;
    for (let i = -2; i <= 2; i += 1) {
      context.beginPath();
      context.moveTo(cx + i * r * 0.32, cy - r * 0.55);
      context.lineTo(cx + i * r * 0.32, cy - r * 0.25);
      context.stroke();
    }
    if (perfect) {
      context.fillStyle = PALETTE.gold;
      text('★', cx + r * 0.7, cy - r * 0.7, 22, PALETTE.gold, 'center', 'bold');
    }
  }

  function drawKitchen(state) {
    // Cream wall with a tile stripe, wood counter, warm floor.
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, 0, FIELD.width, 140);
    context.fillStyle = PALETTE.wallTile;
    for (let x = 0; x < FIELD.width; x += 64) context.fillRect(x, 118, 60, 22);
    context.fillStyle = '#e2574c';
    for (const lx of [96, 1184]) {
      context.beginPath(); context.arc(lx, 66, 24, 0, Math.PI * 2); context.fill();
      context.fillStyle = PALETTE.gold;
      text('福', lx, 74, 20, PALETTE.gold, 'center', 'bold');
      context.fillStyle = '#e2574c';
    }
    context.fillStyle = '#c98f4e';
    context.fillRect(0, 140, FIELD.width, FIELD.height - 140);
    context.fillStyle = PALETTE.counter;
    context.fillRect(0, 140, FIELD.width, 460);
    context.fillStyle = PALETTE.counterTop;
    context.fillRect(0, 140, FIELD.width, 14);
    context.fillStyle = PALETTE.counterDark;
    context.fillRect(0, 596, FIELD.width, 4);
    // (No hanging sign: the ticket board already fills the wall's centre.)
  }

  function drawTickets(state) {
    for (let i = 0; i < 4; i += 1) {
      const r = LAYOUT.tickets[i];
      const order = state.orders[i];
      context.fillStyle = order ? PALETTE.panel : 'rgba(255,248,231,0.35)';
      context.strokeStyle = PALETTE.panelEdge;
      context.lineWidth = 2;
      roundRect(context, r.x, r.y, r.w, r.h, 10); context.fill(); context.stroke();
      if (!order) {
        text('— no order —', r.x + r.w / 2, r.y + 62, 16, PALETTE.muted, 'center');
        continue;
      }
      const rec = RECIPES[order.recipe];
      const frac = Math.max(0, order.patience / order.patienceMax);
      context.fillStyle = rec.color;
      roundRect(context, r.x + 10, r.y + 10, 44, 44, 8); context.fill();
      text(rec.icon, r.x + 32, r.y + 42, 26, '#fff', 'center');
      text(rec.name, r.x + 62, r.y + 30, 17, PALETTE.text, 'left', 'bold');
      text(`$${rec.price}  ·  tip up to $${4}`, r.x + 62, r.y + 52, 14, PALETTE.muted, 'left');
      // Patience bar: green -> amber -> red.
      context.fillStyle = '#e8d9b8';
      roundRect(context, r.x + 10, r.y + 66, r.w - 20, 12, 6); context.fill();
      context.fillStyle = frac > 0.5 ? PALETTE.green : frac > 0.25 ? PALETTE.gold : PALETTE.red;
      if (frac > 0) { roundRect(context, r.x + 10, r.y + 66, (r.w - 20) * frac, 12, 6); context.fill(); }
      text(`⏱ ${Math.ceil(order.patience)}s`, r.x + 10, r.y + 102, 15, frac > 0.25 ? PALETTE.muted : PALETTE.red, 'left', 'bold');
      text(`#${order.id}`, r.x + r.w - 12, r.y + 102, 14, PALETTE.muted, 'right');
    }
  }

  function drawHud(state, screen) {
    const r = LAYOUT.hud;
    context.fillStyle = PALETTE.panel;
    context.strokeStyle = PALETTE.panelEdge; context.lineWidth = 2;
    roundRect(context, r.x, r.y, r.w, r.h, 10); context.fill(); context.stroke();
    const mm = Math.floor(state.timeLeft / 60);
    const ss = String(Math.floor(state.timeLeft % 60)).padStart(2, '0');
    text(timeLabel(`${mm}:${ss}`), r.x + 16, r.y + 34, 30, state.timeLeft < 20 ? PALETTE.red : PALETTE.text, 'left', 'bold');
    text(moneyLabel(state.money), r.x + 16, r.y + 68, 22, PALETTE.text, 'left', 'bold');
    text(goalLabel(state.goal), r.x + 16, r.y + 96, 16, PALETTE.muted, 'left');
    // Hearts.
    for (let i = 0; i < SHIFT.hearts; i += 1) {
      text(i < state.hearts ? '❤️' : '🤍', r.x + 268 + i * 28, r.y + 34, 22, '#000', 'left');
    }
    text(state.combo > 1 ? comboLabel(state.combo) : 'combo —', r.x + 268, r.y + 68, 18, PALETTE.gold, 'left', 'bold');
    text(`★ ${state.perfects} perfect`, r.x + 268, r.y + 96, 15, PALETTE.muted, 'left');
    if (state.flash) text(state.flash, r.x + 130, r.y + 34, 22, PALETTE.green, 'left', 'bold');
  }

  function drawBins(state) {
    const d = LAYOUT.dough;
    context.fillStyle = PALETTE.panel; context.strokeStyle = PALETTE.panelEdge; context.lineWidth = 2;
    roundRect(context, d.x, d.y, d.w, d.h, 10); context.fill(); context.stroke();
    context.fillStyle = '#fff6dd';
    context.beginPath(); context.arc(d.x + 65, d.y + 52, 34, 0, Math.PI * 2); context.fill();
    context.strokeStyle = '#d9a05f'; context.stroke();
    text('DOUGH', d.x + 65, d.y + 106, 16, PALETTE.text, 'center', 'bold');
    text('click ①', d.x + 65, d.y + 74, 13, PALETTE.muted, 'center');
    RECIPES.forEach((rec, i) => {
      const b = LAYOUT.fillings[i];
      context.fillStyle = PALETTE.panel; context.strokeStyle = PALETTE.panelEdge; context.lineWidth = 2;
      roundRect(context, b.x, b.y, b.w, b.h, 10); context.fill(); context.stroke();
      context.fillStyle = rec.color;
      roundRect(context, b.x + 28, b.y + 14, 49, 40, 8); context.fill();
      text(rec.icon, b.x + 52, b.y + 46, 26, '#fff', 'center');
      text(rec.short, b.x + 52, b.y + 78, 14, PALETTE.text, 'center', 'bold');
      text(`$${rec.price}`, b.x + 52, b.y + 100, 13, PALETTE.muted, 'center');
      text(`click ${i + 2}`, b.x + 52, b.y + 116, 11, PALETTE.muted, 'center');
    });
  }

  function drawTray(state) {
    const t = LAYOUT.tray;
    const a = state.assembly;
    context.fillStyle = '#fff8e7'; context.strokeStyle = PALETTE.panelEdge; context.lineWidth = 2;
    roundRect(context, t.x, t.y, t.w, t.h, 10); context.fill(); context.stroke();
    text('ASSEMBLY TRAY', t.x + 16, t.y + 26, 15, PALETTE.muted, 'left', 'bold');
    if (!a.dough && a.filling === -1) {
      text('Empty — take dough, then a filling', t.x + t.w / 2, t.y + 72, 18, PALETTE.muted, 'center');
    } else {
      dumplingIcon(t.x + 90, t.y + 62, 34, a.filling === -1 ? RECIPES[0] : RECIPES[a.filling], a.result === 'PERFECT');
      text(a.filling === -1 ? 'Dough — pick a filling!' : RECIPES[a.filling].name, t.x + 150, t.y + 58, 20, PALETTE.text, 'left', 'bold');
      text(a.filling === -1 ? '' : RECIPES[a.filling].fill, t.x + 150, t.y + 84, 15, PALETTE.muted, 'left');
      if (a.result) text(a.result === 'PERFECT' ? '★ PERFECT FOLD ★' : `${a.result} fold`, t.x + 150, t.y + 108, 16, a.result === 'PERFECT' ? PALETTE.gold : PALETTE.muted, 'left', 'bold');
      else if (a.filling !== -1) text(a.folding ? 'Stop the needle in the green!' : 'Click FOLD below!', t.x + 150, t.y + 108, 16, PALETTE.green, 'left', 'bold');
    }
    // Fold button + meter.
    const b = LAYOUT.foldBtn;
    context.fillStyle = a.filling === -1 ? '#cbb693' : '#e2574c';
    roundRect(context, b.x, b.y, b.w, b.h, 10); context.fill();
    text(a.folding ? '⏸ STOP — IN THE GREEN!' : '🥟  FOLD!  (click / Space)', b.x + b.w / 2, b.y + 37, 22, '#fff', 'center', 'bold');
    const m = LAYOUT.foldMeter;
    context.fillStyle = '#e8d9b8'; roundRect(context, m.x, m.y, m.w, m.h, 8); context.fill();
    context.fillStyle = '#ff8a75'; context.fillRect(m.x + m.w * 0.28, m.y, m.w * 0.5, m.h);
    context.fillStyle = PALETTE.green; context.fillRect(m.x + m.w * 0.42, m.y, m.w * 0.2, m.h);
    const nx = m.x + m.w * a.meter;
    context.fillStyle = '#3a2417';
    context.beginPath(); context.moveTo(nx, m.y - 4); context.lineTo(nx - 7, m.y - 14); context.lineTo(nx + 7, m.y - 14); context.closePath(); context.fill();
    context.fillRect(nx - 2, m.y, 4, m.h);
    text('PERFECT', m.x + m.w * 0.52, m.y + 44, 13, PALETTE.green, 'center', 'bold');
  }

  function drawSteamersAndPlates(state) {
    state.steamers.forEach((s, i) => {
      const r = LAYOUT.steamers[i];
      context.fillStyle = PALETTE.panel; context.strokeStyle = PALETTE.panelEdge; context.lineWidth = 2;
      roundRect(context, r.x, r.y, r.w, r.h, 10); context.fill(); context.stroke();
      text(`STEAMER ${i + 1}`, r.x + r.w / 2, r.y + 24, 15, PALETTE.muted, 'center', 'bold');
      const cx = r.x + r.w / 2, cy = r.y + 82;
      // Bamboo steamer: stacked rings.
      context.fillStyle = '#c98f4e';
      context.beginPath(); context.ellipse(cx, cy + 18, 62, 20, 0, 0, Math.PI * 2); context.fill();
      context.fillStyle = '#e0aa6a';
      context.beginPath(); context.ellipse(cx, cy + 6, 62, 20, 0, 0, Math.PI * 2); context.fill();
      context.fillStyle = '#f2c98a';
      context.beginPath(); context.ellipse(cx, cy - 6, 62, 20, 0, 0, Math.PI * 2); context.fill();
      if (s.recipe === -1) {
        text('empty — click to load', cx, cy + 52, 14, PALETTE.muted, 'center');
      } else {
        const rec = RECIPES[s.recipe];
        const frac = Math.min(1, s.t / STEAM.readyAt);
        const burnt = s.t >= STEAM.burntAt;
        dumplingIcon(cx, cy - 22, 26, rec, false);
        // Progress ring.
        context.strokeStyle = burnt ? PALETTE.red : s.t >= STEAM.readyAt ? PALETTE.gold : PALETTE.green;
        context.lineWidth = 7;
        context.beginPath(); context.arc(cx, cy - 6, 74, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); context.stroke();
        if (burnt) text('🔥 BURNT!', cx, cy + 52, 17, PALETTE.red, 'center', 'bold');
        else if (s.t >= STEAM.readyAt) text('✨ READY TO SERVE', cx, cy + 52, 16, PALETTE.gold, 'center', 'bold');
        else text(`${Math.ceil(STEAM.readyAt - s.t)}s to ready…`, cx, cy + 52, 15, PALETTE.muted, 'center');
        // Steam puffs while cooking.
        if (!burnt) {
          context.fillStyle = 'rgba(255,255,255,0.75)';
          const puff = (state.elapsed * 2 + i) % 1;
          context.beginPath(); context.arc(cx - 20 + puff * 10, cy - 44 - puff * 22, 7 + puff * 5, 0, Math.PI * 2); context.fill();
          context.beginPath(); context.arc(cx + 22 - puff * 8, cy - 40 - puff * 26, 6 + puff * 4, 0, Math.PI * 2); context.fill();
        }
      }
    });
    state.plates.forEach((p, i) => {
      const r = LAYOUT.plates[i];
      const selected = state.selectedPlate === i;
      context.fillStyle = selected ? '#ffe9a8' : PALETTE.panel;
      context.strokeStyle = selected ? PALETTE.gold : PALETTE.panelEdge; context.lineWidth = selected ? 4 : 2;
      roundRect(context, r.x, r.y, r.w, r.h, 10); context.fill(); context.stroke();
      text(`PLATE ${i + 1}`, r.x + r.w / 2, r.y + 24, 15, PALETTE.muted, 'center', 'bold');
      const cx = r.x + r.w / 2, cy = r.y + 72;
      context.fillStyle = '#fff'; context.strokeStyle = '#d9b380'; context.lineWidth = 2;
      context.beginPath(); context.ellipse(cx, cy, 62, 26, 0, 0, Math.PI * 2); context.fill(); context.stroke();
      if (p.recipe === -1) text('empty', cx, cy + 52, 14, PALETTE.muted, 'center');
      else {
        dumplingIcon(cx, cy - 8, 26, RECIPES[p.recipe], false);
        text(RECIPES[p.recipe].name, cx, cy + 44, 15, PALETTE.text, 'center', 'bold');
        text('click its ticket ↑', cx, cy + 62, 12, PALETTE.green, 'center');
      }
    });
    // Bin.
    const b = LAYOUT.bin;
    context.fillStyle = '#8a6a4a'; context.strokeStyle = '#6b4e33'; context.lineWidth = 2;
    roundRect(context, b.x, b.y, b.w, b.h, 10); context.fill(); context.stroke();
    text('🗑  BIN', b.x + b.w / 2, b.y + 34, 18, '#fff', 'center', 'bold');
    text('toss burnt dumplings', b.x + b.w / 2, b.y + 62, 13, '#ffe9b8', 'center');
    text('or clear the tray', b.x + b.w / 2, b.y + 84, 13, '#ffe9b8', 'center');
  }

  function drawMessage(state) {
    if (!state.message) return;
    context.fillStyle = 'rgba(58,36,23,0.85)';
    const w = Math.min(760, context.measureText ? 760 : 760);
    roundRect(context, (FIELD.width - w) / 2, 606, w, 40, 10); context.fill();
    text(state.message, FIELD.width / 2, 633, 19, '#fff3d6', 'center');
  }

  function drawFooter(state) {
    text('Click: dough ① → filling ② → FOLD in the green → steamer → plate → ticket to serve.  Keys: 1 dough, 2–6 fillings, Space fold, P pause.', FIELD.width / 2, 678, 15, '#ffe9b8', 'center');
    text('Serve fast for tips. A perfect fold is +$2. Burnt dumplings and walked-out customers cost a heart.', FIELD.width / 2, 700, 14, '#f2dcae', 'center');
  }

  function drawPanel(title, lines, prompt, accent) {
    const w = 680;
    const h = 150 + lines.length * 36;
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - h) / 2;
    context.fillStyle = 'rgba(43,29,22,0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel; context.strokeStyle = PALETTE.panelEdge; context.lineWidth = 3;
    roundRect(context, x, y, w, h, 16); context.fill(); context.stroke();
    text(title, FIELD.width / 2, y + 74, 46, accent || PALETTE.text, 'center', 'bold');
    context.textBaseline = 'alphabetic';
    lines.forEach((line, i) => text(line, FIELD.width / 2, y + 128 + i * 36, 21, PALETTE.muted, 'center'));
    text(prompt, FIELD.width / 2, y + h - 32, 22, '#e2574c', 'center', 'bold');
  }

  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawKitchen(state);
    drawTickets(state);
    drawHud(state, screen);
    drawBins(state);
    drawTray(state);
    drawSteamersAndPlates(state);
    drawMessage(state);
    drawFooter(state);
    if (screen === SCREEN_TITLE) {
      drawPanel('🥟 FOLD & STEAM', [
        'Run your own dumpling house for one busy shift.',
        'Fold in the green, steam till golden, serve before patience runs out.',
        `Earn $${SHIFT.goal} before the ${Math.floor(SHIFT.seconds / 60)}½-minute shift ends — 3 hearts, 5 recipes, 2 steamers.`,
        best > 0 ? `Best takings so far: $${best}` : 'Your first shift starts now.',
      ], 'Press Space or click to open the shop', '#e2574c');
    } else if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The steamers are holding. The customers are waiting.'], 'Press P to get back to work');
    } else if (screen === SCREEN_OVER) {
      if (state.won) {
        drawPanel('🎉 SHIFT COMPLETE!', [
          `Takings $${state.money} — goal $${state.goal} smashed!`,
          `${state.served} orders served · ${state.perfects} perfect folds · best combo x${state.bestCombo}`,
          best > 0 ? `Best takings: $${best}` : '',
        ], 'Press Space or click to play another shift', PALETTE.green);
      } else {
        drawPanel('⏰ SHIFT OVER', [
          `Takings $${state.money} — goal was $${state.goal}.`,
          `${state.served} orders served · ${state.failed} lost · ${state.perfects} perfect folds`,
          state.hearts <= 0 ? 'The shop lost all three hearts.' : 'The clock ran out before the goal.',
        ], 'Press Space or click to try again', PALETTE.red);
      }
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toLogical };
}
