// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. Four screens:
// title, play, paused and game over (win or lose).
//
// ?seed=N fixes the order pattern. ?shot=start|play|win|lose (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, LAYOUT, RECIPES, SHIFT, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld,
  EVENT_BURNT, EVENT_FAIL, EVENT_LOSE, EVENT_PERFECT, EVENT_READY, EVENT_SERVE, EVENT_WIN,
} from './world.js';
import { ACTION_CONFIRM, ACTION_DOUGH, ACTION_FOLD, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';
import { sfx } from './audio.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { return 0; }
}
function saveBest(value) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); } catch { /* private windows */ }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, (x, y) => renderer.toLogical(x, y));
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) { status.textContent = message; }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing. Earn $${SHIFT.goal} before the shift ends.`);
  }

  function endGame(events) {
    screen = SCREEN_OVER;
    if (world.state.money > best) { best = world.state.money; saveBest(best); }
    if (events & EVENT_WIN) { sfx.win(); announce(`Shift complete! Takings $${world.state.money}.`); }
    else announce(`Shift over. Takings $${world.state.money}.`);
  }

  function playSound(events) {
    if (events & EVENT_PERFECT) sfx.perfect();
    else if (events & EVENT_SERVE) sfx.serve();
    else if (events & EVENT_READY) sfx.ready();
    else if (events & EVENT_BURNT) sfx.burnt();
    else if (events & EVENT_FAIL) sfx.fail();
  }

  function foldAtButton() {
    const b = LAYOUT.foldBtn;
    return world.clickAt(b.x + b.w / 2, b.y + b.h / 2);
  }

  function handleActions() {
    const actions = input.takeActions();
    const clicks = input.takeClicks();
    const fillKey = input.takeFillKey();
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      if ((actions & ACTION_CONFIRM) || clicks.length > 0) startGame();
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) { screen = SCREEN_PLAY; announce('Playing.'); }
      return;
    }
    // SCREEN_PLAY
    if (actions & ACTION_PAUSE) { screen = SCREEN_PAUSED; announce('Paused.'); return; }
    if (actions & ACTION_DOUGH) {
      const b = LAYOUT.dough;
      world.clickAt(b.x + b.w / 2, b.y + b.h / 2);
    }
    if (fillKey >= 0) {
      const b = LAYOUT.fillings[fillKey];
      world.clickAt(b.x + b.w / 2, b.y + b.h / 2);
    }
    if (actions & (ACTION_CONFIRM | ACTION_FOLD)) {
      // Space / F on play folds (pointer clicks carry their own coordinates).
      foldAtButton();
    }
    for (const c of clicks) {
      const ev = world.clickAt(c.x, c.y);
      playSound(ev);
      if (ev & (EVENT_WIN | EVENT_LOSE)) endGame(ev);
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) return;
    const events = world.step(STEP);
    playSound(events);
    if (events & (EVENT_WIN | EVENT_LOSE)) endGame(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
  });

  announce('Fold and Steam. Press Space or click to open the shop.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
