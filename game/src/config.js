// Fold & Steam — tuning, recipes and layout in one place.
// Logical playfield is 1280x720; the renderer scales it to the window.

export const FIELD = { width: 1280, height: 720 };

/** Fixed simulation step, seconds: 60 updates a second whatever the display rate. */
export const STEP = 1 / 60;

/** One shift: seconds of play, and the takings that win the shift. */
export const SHIFT = { seconds: 150, goal: 90, hearts: 3 };

/** Five dumplings. price is the base takings; tip is added from patience left. */
export const RECIPES = [
  { id: 'pork',    name: 'Pork & Chive',  short: 'PORK',    price: 8,  color: '#e58a8a', dark: '#b85c5c', icon: '🥬', fill: 'pork + chive' },
  { id: 'shrimp',  name: 'Fresh Shrimp',  short: 'SHRIMP',  price: 12, color: '#ff9e6b', dark: '#d96a2e', icon: '🦐', fill: 'shrimp + ginger' },
  { id: 'shroom',  name: 'Mushroom Veg',  short: 'SHROOM',  price: 7,  color: '#c9a06a', dark: '#8a6a3c', icon: '🍄', fill: 'mushroom + tofu' },
  { id: 'beef',    name: 'Beef & Onion',  short: 'BEEF',    price: 10, color: '#d96a6a', dark: '#a03d3d', icon: '🧅', fill: 'beef + onion' },
  { id: 'sesame',  name: 'Sesame Sweet',  short: 'SESAME',  price: 6,  color: '#b9a7e6', dark: '#7a63b8', icon: '🍯', fill: 'sesame + sugar' },
];

export const ORDERS = {
  maxTickets: 4,
  firstSpawn: 0,
  spawnEvery: 7,
  patience: 45,
  tipMax: 4,
};

export const FOLD = {
  /** Green PERFECT window on the 0..1 meter. */
  greenLo: 0.42, greenHi: 0.62,
  /** Yellow OK window. Outside it the fold is sloppy (still works, no bonus). */
  okLo: 0.28, okHi: 0.78,
  perfectBonus: 2,
  speed: 1.15, // meter sweeps per second
};

export const STEAM = {
  readyAt: 6,   // seconds: golden and ready to plate
  burntAt: 10,  // seconds: left longer, it burns
  count: 2,
};

export const PLATES = { count: 2 };

/** Clickable zones, in logical coordinates. Render draws them from these same rects. */
export const LAYOUT = {
  dough:    { x: 40,  y: 150, w: 130, h: 120 },
  fillings: RECIPES.map((_, i) => ({ x: 190 + i * 115, y: 150, w: 105, h: 120 })),
  tray:     { x: 790, y: 150, w: 450, h: 120 },
  foldBtn:  { x: 790, y: 286, w: 450, h: 58 },
  foldMeter:{ x: 790, y: 352, w: 450, h: 26 },
  steamers: [ { x: 60,  y: 430, w: 220, h: 150 }, { x: 300, y: 430, w: 220, h: 150 } ],
  plates:   [ { x: 580, y: 430, w: 220, h: 150 }, { x: 820, y: 430, w: 220, h: 150 } ],
  bin:      { x: 1060, y: 430, w: 180, h: 150 }, // trash a burnt / wrong dumpling
  tickets:  [0, 1, 2, 3].map((i) => ({ x: 24 + i * 218, y: 16, w: 206, h: 112 })),
  hud:      { x: 900, y: 16, w: 356, h: 112 },
};

export const PALETTE = {
  backdrop: '#2b1d16',
  wall: '#f7e8c9',
  wallTile: '#f2dcae',
  counter: '#b07a45',
  counterDark: '#8a5a2e',
  counterTop: '#d9a05f',
  panel: '#fff8e7',
  panelEdge: '#d9b380',
  text: '#3a2417',
  muted: '#8a6a4a',
  cream: '#fff3d6',
  green: '#3d9b4f',
  greenLight: '#7ed491',
  gold: '#e8a91c',
  goldLight: '#ffd34d',
  red: '#d94f3d',
  redLight: '#ff8a75',
  steam: '#ffffff',
  shadow: 'rgba(58,36,23,0.18)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Best takings kept between visits (this browser only). */
export const BEST_KEY = 'fold-and-steam.best';
