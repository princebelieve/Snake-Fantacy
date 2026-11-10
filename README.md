# Amara's Fantacy

Amara's Fantacy is an offline-first Snake adventure built with JavaScript modules and Canvas. David's efforts have led down endless paths without bringing their child home. In her fantasy, Amara becomes a river goddess who can take many forms. She journeys downstream as a serpent to claim the sea's power, face Victor, and rescue her child.

## Play

Run `python -m http.server 8000` from the project root and open `http://localhost:8000`. After the first successful load, the service worker caches the game, chapters, artwork, and sound locally. Use arrow keys or W/A/S/D on desktop; swipe or use the direction pad on touch screens.

The first-run sequence is a short studio-brand splash, a logo loading screen, the game menu, the selected chapter's story, and then the board. Chapter 1 opens with a guided tutorial for the HUD, fruit, hazards, and controls. The Amara portrait from Save The Baby is reused in the river-serpent game emblem and story screen.

Regular fruit remains until eaten and grows Amara's serpent. After every five regular fruit, a special fruit appears for a short time. It awards five times the points of the fifth regular fruit, but does not grow the serpent or count toward the chapter objective. If it expires, the only loss is those possible bonus points. Chapter goals and movement speed both rise through the 50-chapter journey.

## Game and engine structure

- `js/engine/` contains the reusable fixed-step runtime, scenes, entities, input, physics, events, random source, config loader, and save store.
- `js/games/snake/` contains Amara's game flow, chapter loading and validation, saved progression, sprite loading, and audio.
- `js/games/SnakeScene.js` contains movement, visible obstacle placement, collision, fruit, bonus timing, and board rendering.
- `data/snake/levels.json` defines 50 chapters, five story arcs, goddess forms, rising food goals, speed, obstacles, and portal passages.
- `assets/snake/` contains the serpent and food sprites plus Amara's portrait and coiled-serpent game icon; `assets/audio/` contains five local WAV sound effects.
- `js/ui/GameUI.js` presents the journey map, objective HUD, pause, chapter results, and final story ending.
- `tests/engine.test.js` checks engine contracts, chapter validation, rising difficulty, visible collision placement, bonus rules, and progression.

The car-racing and sky-shooter scenes remain engine consumers for movement and collision coverage; they are not advertised as released games.

## Checks

```sh
node --experimental-default-type=module --test tests/engine.test.js
```

See [GAME_PLAN.md](GAME_PLAN.md), [docs/ENGINE_API.md](docs/ENGINE_API.md), and [docs/SNAKE_LEVEL_SCHEMA.md](docs/SNAKE_LEVEL_SCHEMA.md).
