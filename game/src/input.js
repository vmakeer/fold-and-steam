// Keyboard and pointer input. Held keys are not needed here: every action is
// a click (or its key shortcut), queued as one-shot flags and taken once by
// the loop, so a press between two frames is never lost or counted twice.
// Pointer clicks are queued with their logical coordinates; the world
// hit-tests them. Hover position is kept for highlight-free simplicity.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DOUGH = 4;
export const ACTION_FOLD = 8;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const FILL_KEYS = { Digit2: 0, Digit3: 1, Digit4: 2, Digit5: 3, Digit6: 4, Numpad2: 0, Numpad3: 1, Numpad4: 2, Numpad5: 3, Numpad6: 4 };

export function createInput(target, toLogical) {
  let actions = 0;
  let clicks = [];
  let fillKey = -1;
  let hover = { x: -1, y: -1 };

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) { if (!event.repeat) actions |= ACTION_CONFIRM; }
    else if (PAUSE.has(event.code)) { if (!event.repeat) actions |= ACTION_PAUSE; }
    else if (event.code === 'Digit1' || event.code === 'Numpad1') { if (!event.repeat) actions |= ACTION_DOUGH; }
    else if (event.code === 'KeyF') { if (!event.repeat) actions |= ACTION_FOLD; }
    else if (event.code in FILL_KEYS) { if (!event.repeat) fillKey = FILL_KEYS[event.code]; }
    else return;
    event.preventDefault();
  });
  target.addEventListener('pointerdown', (event) => {
    const p = toLogical(event.clientX, event.clientY);
    clicks.push(p);
  });
  target.addEventListener('pointermove', (event) => {
    hover = toLogical(event.clientX, event.clientY);
  });

  return {
    takeActions() { const taken = actions; actions = 0; return taken; },
    takeClicks() { const taken = clicks; clicks = []; return taken; },
    takeFillKey() { const taken = fillKey; fillKey = -1; return taken; },
    hover() { return hover; },
  };
}
