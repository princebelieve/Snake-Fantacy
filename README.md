# Snake Fantasy

Snake Fantasy is an offline-first browser arcade game and the first complete game built on a reusable 2D engine. It is made with JavaScript ES modules and Canvas; it does not require Godot, a build tool, or a network connection after the first successful load.

## Play

Serve the project over HTTPS or from `localhost`, then open the root page. Use arrow keys or W/A/S/D to turn. On touch devices, swipe on the board or use the direction pad. The menu provides level selection, saved best scores, retry, pause, and progression.

## Architecture

- `js/engine/` contains the reusable runtime, scenes, entities, input, physics, events, random source, config loader, and save store.
- `js/games/snake/` contains game flow, level loading/validation, and progression persistence.
- `js/games/SnakeScene.js` contains Snake mechanics and board presentation.
- `data/snake/levels.json` defines five levels outside the mechanics code.
- `js/ui/GameUI.js` handles DOM presentation and forwards user actions to the game manager.
- `service-worker.js` pre-caches the app shell and Snake level data for offline play.
- `tests/engine.test.js` checks engine contracts and gameplay integration.

The car-racing and sky-shooter scene modules are separate engine consumers used to validate genre-specific movement and collision needs. Snake Fantasy is the only finished game in the app so far; those scenes need their own game design and complete player loops before release.

## Run checks

```sh
node --experimental-default-type=module --test tests/engine.test.js
```

Project direction is documented in [GAME_PLAN.md](GAME_PLAN.md), the engine contracts in [docs/ENGINE_API.md](docs/ENGINE_API.md), and the level file format in [docs/SNAKE_LEVEL_SCHEMA.md](docs/SNAKE_LEVEL_SCHEMA.md).
