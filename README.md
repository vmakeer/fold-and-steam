# Fold & Steam — a dumpling house game

[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![Rank](https://make.fun/badge/best-cooking-game-20261125-0137/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![Reward](https://make.fun/badge/best-cooking-game-20261125-0137/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

Run your own dumpling house for one busy shift. Orders land on the ticket
board with a patience bar; you assemble each dumpling by hand — dough,
filling, a timed fold — steam it in one of two bamboo steamers until the
ring turns golden, plate it, and serve the matching ticket before the
customer walks out.

## How to play

1. **Dough** — click the dough bin (or press `1`).
2. **Filling** — click one of the five filling bins (or press `2`–`6`):
   Pork & Chive $8, Fresh Shrimp $12, Mushroom Veg $7, Beef & Onion $10,
   Sesame Sweet $6.
3. **Fold** — click FOLD (or press Space / `F`). A needle sweeps the meter;
   stop it in the **green** for a PERFECT fold (+$2). Yellow is OK, red is
   sloppy — still edible.
4. **Steam** — click an empty steamer. Ready in 6 seconds (golden ring,
   READY TO SERVE); leave it past 10 seconds and it burns.
5. **Plate & serve** — click a ready steamer to plate it, then click its
   order ticket. Serving fast earns a tip (up to $4); serving on a streak
   builds a combo bonus.

Earn **$90** before the 2½-minute shift ends to win. A walked-out customer
or a burnt dumpling costs one of your **3 hearts** — lose all three and the
shop closes early.

## Run it

No build step, no network: static files only.

```sh
# serve game/ with any static server, e.g.
python3 -m http.server 8080 --directory game
# then open http://localhost:8080
```

`?seed=N` fixes the order pattern; `?shot=start|play|win|lose&seed=N`
stages a screenshot scene (the autopilot plays the real rules forward).

## Screenshots

1. Title — the shop opens
2. Mid-shift — tickets, tray mid-fold, a steamer ready, a plate to serve
3. Shift complete — the goal smashed
4. Shift over — the clock (or the hearts) ran out

## Files

- `game/` — the playable game (Canvas 2D, hand-drawn art, WebAudio synth
  sounds, no libraries, no external assets)
  - `game/src/config.js` — tuning, recipes, layout
  - `game/src/world.js` — rules and state (orders, fold meter, steamers)
  - `game/src/render.js` — all drawing
  - `game/src/input.js` — mouse + keyboard
  - `game/src/shots.js` — screenshot autopilot (plays the real game)
  - `game/src/audio.js` — synthesised sound effects
  - `game/src/main.js` — boot and fixed-step loop
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json`
- `screenshots/` — four real renders of the game

## Entry

Built for the make.fun bounty
[Make the best cooking game](https://make.fun/bounty/best-cooking-game-20261125-0137)
(`best-cooking-game-20261125-0137`). MIT licensed, original art, sounds,
music and names throughout.
