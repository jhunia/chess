# Tempo Chess

A phone-first chess training web app: play bots with a live coach, solve rated puzzles, take interactive lessons, review your games and analyse positions. Everything runs in the browser, with no server and no accounts.

## Features

- **Bots**: 16 original opponents from about 250 to 2300, each with its own style, plus pass-and-play on one phone. Optional clocks.
- **Coach mode**: every move gets a verdict (Brilliant, Best, Mistake, Blunder…) and a plain-language explanation, with hints, takebacks and an eval bar.
- **Puzzles**: rated puzzles mined from engine games and checked move by move. Includes a daily puzzle, Puzzle Rush (3 min, 5 min, survival) and theme training.
- **Lessons**: 34 interactive lessons in 6 courses, from how the pieces move to the Lucena position. Lessons can be read aloud.
- **Game review**: accuracy per side, move classifications, a winning-chances graph, best-move arrows and key moments.
- **Analysis board**: multi-line engine output, FEN and PGN import, board setup, and play-from-here.
- **Also included**: endgame drills against the engine, an opening explorer with practice mode, a coordinate trainer, a game archive, stats and awards, and board themes.
- **AI tutor chat**: available when the app is opened from its Claude artifact link.

## Use it on an iPhone

Host `tempo-chess-standalone.html` on any static host (GitHub Pages works), open it in Safari, then tap Share and choose Add to Home Screen. Progress is saved in the browser.

## Project layout

| Path | What it is |
| --- | --- |
| `src/engine.js` | Rules (0x88 board) and alpha-beta search engine, shared by the page, a Web Worker and Node |
| `src/core.js` | Board widget, piece art, engine bridge, move judging and explanations |
| `src/app*.js` | Screens |
| `src/content.js`, `src/openings.js` | Bots, coaches, lessons, drills and opening lines |
| `tools/` | Perft tests, puzzle generator, content verifier, build script |

## Build

```bash
node tools/perft.js              # move generation tests
node tools/gen-puzzles.js build/p1.json 300   # mine puzzles for 300 seconds
node tools/build.js              # bundle into tempo-chess.html and tempo-chess-standalone.html
node tools/verify.js             # check every lesson, opening, drill and puzzle against the rules
```
