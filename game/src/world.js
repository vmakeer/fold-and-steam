// Fold & Steam rules and state, with no drawing and no browser in it.
// One shift: orders arrive on the board, the cook assembles dumplings on the
// tray (dough -> filling -> timed fold), steams them in one of two steamers,
// plates them, then serves the matching ticket before its patience runs out.
// step() advances one fixed step and returns what happened as bit flags, so
// the caller can play sounds without the world knowing about screens.
// clickAt(x, y) is the whole mouse interface: bins, tray, fold button,
// steamers, plates, bin and tickets all go through it, so the autopilot
// that stages screenshots plays by clicking the same zones a player does.
import { FIELD, FOLD, LAYOUT, ORDERS, PLATES, RECIPES, SHIFT, STEAM } from './config.js';

export const EVENT_NONE = 0;
export const EVENT_CLICK = 1;
export const EVENT_FILL = 2;
export const EVENT_PERFECT = 4;
export const EVENT_FOLD = 8;
export const EVENT_READY = 16;
export const EVENT_SERVE = 32;
export const EVENT_FAIL = 64;
export const EVENT_BURNT = 128;
export const EVENT_WIN = 256;
export const EVENT_LOSE = 512;

let nextOrderId = 1;

function inRect(x, y, r) {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

function tipFor(order) {
  return Math.round((order.patience / order.patienceMax) * ORDERS.tipMax);
}

export function createWorld(random) {
  const state = {
    money: 0, goal: SHIFT.goal, timeLeft: SHIFT.seconds, hearts: SHIFT.hearts,
    combo: 0, bestCombo: 0, perfects: 0, served: 0, failed: 0,
    orders: [], spawnTimer: ORDERS.firstSpawn,
    assembly: { dough: false, filling: -1, folding: false, meter: 0, dir: 1, result: '' },
    steamers: [], plates: [], selectedPlate: -1,
    message: '', messageTimer: 0, flash: '',
    over: false, won: false, elapsed: 0,
  };
  for (let i = 0; i < STEAM.count; i += 1) state.steamers.push({ recipe: -1, t: 0, announced: false });
  for (let i = 0; i < PLATES.count; i += 1) state.plates.push({ recipe: -1 });

  function reset() {
    state.money = 0; state.timeLeft = SHIFT.seconds; state.hearts = SHIFT.hearts;
    state.combo = 0; state.bestCombo = 0; state.perfects = 0; state.served = 0; state.failed = 0;
    state.orders = []; state.spawnTimer = 0.5;
    state.assembly = { dough: false, filling: -1, folding: false, meter: 0, dir: 1, result: '' };
    for (const s of state.steamers) { s.recipe = -1; s.t = 0; s.announced = false; }
    for (const p of state.plates) p.recipe = -1;
    state.selectedPlate = -1; state.message = 'Click the dough, then a filling!'; state.messageTimer = 0;
    state.flash = ''; state.over = false; state.won = false; state.elapsed = 0;
    nextOrderId = 1;
    spawnOrder(); spawnOrder(); spawnOrder();
  }

  function spawnOrder() {
    if (state.orders.length >= ORDERS.maxTickets) return;
    // Prefer a recipe no live ticket already asks for, so the board stays varied.
    const wanted = RECIPES.map((_, i) => i).filter((i) => !state.orders.some((o) => o.recipe === i));
    const pool = wanted.length ? wanted : RECIPES.map((_, i) => i);
    const recipe = pool[Math.floor(random() * pool.length)];
    state.orders.push({ id: nextOrderId++, recipe, patience: ORDERS.patience, patienceMax: ORDERS.patience });
  }

  function say(text, seconds = 2.2) {
    state.message = text; state.messageTimer = seconds;
  }

  function loseHeart(reason) {
    state.hearts -= 1; state.combo = 0; state.failed += 1;
    say(reason, 2.5);
    if (state.hearts <= 0) { state.over = true; state.won = false; return EVENT_LOSE; }
    return EVENT_FAIL;
  }

  function finishFold() {
    const a = state.assembly;
    a.folding = false;
    const m = a.meter;
    let ev = EVENT_FOLD;
    if (m >= FOLD.greenLo && m <= FOLD.greenHi) {
      a.result = 'PERFECT'; state.perfects += 1; state.money += FOLD.perfectBonus; ev |= EVENT_PERFECT;
      say(`PERFECT fold! +$${FOLD.perfectBonus} bonus`);
    } else if (m >= FOLD.okLo && m <= FOLD.okHi) {
      a.result = 'OK'; say('Folded. Into the steamer!');
    } else {
      a.result = 'SLOPPY'; say('Sloppy fold… still edible. Into the steamer!');
    }
    return ev;
  }

  /** Serve ticket `order` with the plated dumpling on plate `pi`. Assumes a match. */
  function serve(pi, order) {
    const recipe = RECIPES[order.recipe];
    const tip = tipFor(order);
    const comboBonus = state.combo >= 2 ? 2 : 0;
    const earned = recipe.price + tip + comboBonus;
    state.money += earned;
    state.served += 1; state.combo += 1; state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.plates[pi].recipe = -1; state.selectedPlate = -1;
    state.orders = state.orders.filter((o) => o.id !== order.id);
    state.flash = `+$${earned}`;
    say(`Served ${recipe.name}! +$${earned}${tip ? ` (tip $${tip})` : ''}${comboBonus ? ' COMBO!' : ''}`, 2.2);
    if (state.money >= state.goal) { state.over = true; state.won = true; return EVENT_SERVE | EVENT_WIN; }
    return EVENT_SERVE;
  }

  function clickAt(x, y) {
    if (state.over) return EVENT_NONE;
    let ev = EVENT_CLICK;
    const a = state.assembly;

    // Tickets: serve a matching plated dumpling (auto-pick the plate).
    for (let i = 0; i < state.orders.length; i += 1) {
      const r = LAYOUT.tickets[i];
      if (inRect(x, y, r)) {
        const order = state.orders[i];
        const pi = state.plates.findIndex((p) => p.recipe === order.recipe);
        if (pi === -1) { say(`No ${RECIPES[order.recipe].name} plated yet — steam one first!`); return ev; }
        return serve(pi, order);
      }
    }
    // Dough bin.
    if (inRect(x, y, LAYOUT.dough)) {
      if (a.dough) { say('Dough already on the tray — pick a filling!'); return ev; }
      if (a.filling !== -1) { say('Finish this dumpling first!'); return ev; }
      a.dough = true; a.result = ''; say('Dough ready — now a filling!');
      return ev | EVENT_CLICK;
    }
    // Filling bins.
    for (let i = 0; i < RECIPES.length; i += 1) {
      if (inRect(x, y, LAYOUT.fillings[i])) {
        if (!a.dough) { say('Take dough first, then a filling!'); return ev; }
        if (a.filling !== -1) { say('Filling already in — fold it!'); return ev; }
        a.filling = i; say(`${RECIPES[i].name} in — click FOLD and stop in the green!`);
        return ev | EVENT_FILL;
      }
    }
    // Fold button / tray: start the meter, or stop it.
    if (inRect(x, y, LAYOUT.foldBtn) || inRect(x, y, LAYOUT.tray)) {
      if (a.filling === -1) { say('Dough + filling first, then fold!'); return ev; }
      if (!a.folding) { a.folding = true; a.meter = 0; a.dir = 1; say('Stop the needle in the GREEN!'); return ev; }
      return finishFold();
    }
    // Steamers: place a folded dumpling, or lift a ready one to a plate.
    for (let i = 0; i < state.steamers.length; i += 1) {
      if (inRect(x, y, LAYOUT.steamers[i])) {
        const s = state.steamers[i];
        if (s.recipe === -1) {
          if (a.filling === -1 || a.folding) { say('Fold a dumpling first, then steam it!'); return ev; }
          s.recipe = a.filling; s.t = 0; s.announced = false;
          a.dough = false; a.filling = -1; a.result = '';
          say(`${RECIPES[s.recipe].name} steaming… watch the ring!`);
          return ev;
        }
        if (s.t >= STEAM.readyAt && s.t < STEAM.burntAt) {
          const pi = state.plates.findIndex((p) => p.recipe === -1);
          if (pi === -1) { say('No empty plate — serve one first!'); return ev; }
          state.plates[pi].recipe = s.recipe; state.selectedPlate = pi;
          say(`${RECIPES[s.recipe].name} plated — click its ticket to serve!`);
          s.recipe = -1; s.t = 0; s.announced = false;
          return ev;
        }
        if (s.t >= STEAM.burntAt) { say('Burnt! Click the bin to toss it, or it stays put.'); return ev; }
        say('Still steaming… wait for the golden ring!');
        return ev;
      }
    }
    // Plates: tap to select (ticket click does the serving anyway).
    for (let i = 0; i < state.plates.length; i += 1) {
      if (inRect(x, y, LAYOUT.plates[i])) {
        if (state.plates[i].recipe === -1) { say('Empty plate.'); return ev; }
        state.selectedPlate = i;
        say(`Plated ${RECIPES[state.plates[i].recipe].name} — click its ticket!`);
        return ev;
      }
    }
    // Bin: toss a burnt steamer dumpling, or clear the tray.
    if (inRect(x, y, LAYOUT.bin)) {
      const burnt = state.steamers.findIndex((s) => s.recipe !== -1 && s.t >= STEAM.burntAt);
      if (burnt !== -1) {
        state.steamers[burnt].recipe = -1; state.steamers[burnt].t = 0;
        say('Burnt dumpling tossed. One heart lost…');
        return loseHeart('Burnt dumpling tossed — a heart is lost.');
      }
      if (a.dough || a.filling !== -1) {
        state.assembly = { dough: false, filling: -1, folding: false, meter: 0, dir: 1, result: '' };
        say('Tray cleared. Start again!');
        return ev;
      }
      say('Nothing to toss.');
      return ev;
    }
    return EVENT_NONE;
  }

  function step(dt) {
    let events = EVENT_NONE;
    if (state.over) return events;
    state.elapsed += dt;
    state.timeLeft -= dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;

    // Fold meter sweeps back and forth while folding.
    const a = state.assembly;
    if (a.folding) {
      a.meter += a.dir * FOLD.speed * dt;
      if (a.meter >= 1) { a.meter = 1; a.dir = -1; }
      if (a.meter <= 0) { a.meter = 0; a.dir = 1; }
    }

    // Orders: patience drains; an expired ticket costs a heart.
    for (const o of [...state.orders]) {
      o.patience -= dt;
      if (o.patience <= 0) {
        state.orders = state.orders.filter((x) => x.id !== o.id);
        events |= loseHeart(`Walked out! ${RECIPES[o.recipe].name} took too long.`);
        if (state.over) return events;
      }
    }
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) { spawnOrder(); state.spawnTimer = ORDERS.spawnEvery; }

    // Steamers: ready chime once, then burn.
    for (const s of state.steamers) {
      if (s.recipe === -1) continue;
      s.t += dt;
      if (!s.announced && s.t >= STEAM.readyAt) { s.announced = true; events |= EVENT_READY; say(`${RECIPES[s.recipe].name} is READY — plate it!`); }
      if (s.t >= STEAM.burntAt + 4) {
        // Left burnt far too long: it is tossed automatically, heart lost.
        s.recipe = -1; s.t = 0; s.announced = false;
        events |= EVENT_BURNT | loseHeart('A dumpling burnt in the steamer!');
        if (state.over) return events;
      }
    }

    if (state.timeLeft <= 0) {
      state.timeLeft = 0; state.over = true; state.won = state.money >= state.goal;
      events |= state.won ? EVENT_WIN : EVENT_LOSE;
    }
    return events;
  }

  reset();
  return { state, reset, step, clickAt, serve };
}

export { FIELD };
