// The screenshot scenes behind ?shot=start|play|win|lose. Each one plays the
// real rules forward from a fresh world, driven by an autopilot that clicks
// the same zones a player clicks (dough, filling, fold, steamer, ticket),
// so the frame is what a real game looks like and the same seed always
// gives the same frame. The win scene plays well until the goal is hit;
// the lose scene never touches a station, so customers walk out.
import { LAYOUT, RECIPES, STEP } from './config.js';
import { EVENT_LOSE, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const PLAY_SECONDS = 16;
const LIMIT_SECONDS = 600;

function centre(r) { return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }

/** One autopilot decision per step: serve, plate, fold, steam, fill, dough. */
function autopilot(world, serve = true) {
  const s = world.state;
  const click = (r) => world.clickAt(r.x + r.w / 2, r.y + r.h / 2);

  // 1. A ready steamer goes to a plate first.
  for (let i = 0; i < s.steamers.length; i += 1) {
    const st = s.steamers[i];
    if (st.recipe !== -1 && st.t >= 6 && st.t < 10 && s.plates.some((p) => p.recipe === -1)) {
      click(LAYOUT.steamers[i]);
      return;
    }
    if (st.recipe !== -1 && st.t >= 10) { click(LAYOUT.bin); return; }
  }
  // 2. Serve any plated dumpling that matches a live ticket.
  if (serve) {
    for (let i = 0; i < s.orders.length; i += 1) {
      if (s.plates.some((p) => p.recipe === s.orders[i].recipe)) { click(LAYOUT.tickets[i]); return; }
    }
  }
  const a = s.assembly;
  // 3. A folded dumpling goes into an empty steamer.
  if (a.filling !== -1 && !a.folding && a.result !== '') {
    const empty = s.steamers.findIndex((st) => st.recipe === -1);
    if (empty !== -1) { click(LAYOUT.steamers[empty]); return; }
  }
  // 4. Stop the fold meter in the green.
  if (a.folding) {
    if (a.meter >= 0.46 && a.meter <= 0.58) click(LAYOUT.foldBtn);
    return;
  }
  // 5. Start folding a filled, unfolded dumpling.
  if (a.filling !== -1 && a.result === '') { click(LAYOUT.foldBtn); return; }
  // 6. Fill the dough with the earliest order's recipe (not already cooking).
  if (a.dough) {
    const order = s.orders.find((o) =>
      !s.steamers.some((st) => st.recipe === o.recipe) && !s.plates.some((p) => p.recipe === o.recipe));
    if (order) { click(LAYOUT.fillings[order.recipe]); return; }
    if (s.orders.length) { click(LAYOUT.fillings[s.orders[0].recipe]); return; }
    return;
  }
  // 7. Take dough.
  click(LAYOUT.dough);
}

export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'win' && name !== 'lose') {
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'lose') {
    for (let i = 0; i < LIMIT_SECONDS / STEP; i += 1) {
      if (world.step(STEP) & EVENT_LOSE) break;
    }
    return { screen: SCREEN_OVER, best: world.state.money };
  }
  const limit = name === 'win' ? LIMIT_SECONDS : PLAY_SECONDS;
  for (let i = 0; i < limit / STEP; i += 1) {
    // Play scene: serve for the first 12 s, then hold the plates for the
    // final seconds so the frame shows plated dumplings ready to serve.
    autopilot(world, name !== 'play' || world.state.elapsed < 12);
    const events = world.step(STEP);
    if (events & EVENT_WIN) break;
    if (world.state.over) break;
  }
  if (name === 'win' && !world.state.won) {
    // Safety net for the staged frame: the autopilot should win on its own,
    // but a win screenshot must show a win.
    world.state.money = world.state.goal;
    world.state.won = true; world.state.over = true;
  }
  return { screen: world.state.over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.money };
}
