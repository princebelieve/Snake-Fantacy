# Snake Fantasy: game and engine plan

## Product direction

Snake Fantasy is a complete browser game built on a reusable 2D engine. Snake is the first shipped game and the engine's first full consumer. The same engine services are intended for later game modules such as racing and shooting, while their gameplay rules and content remain separate.

The project is browser-first and offline-first. It uses ES modules and Canvas, with no build step. Game data and code are cached by the service worker so a previously loaded game can continue offline.

## Snake game loop

1. Open the game menu and continue from the highest unlocked level or choose an unlocked level.
2. Steer with keyboard, touch swipes, or the on-screen direction pad.
3. Collect the configured food target while avoiding walls, the snake, and level obstacles.
4. Complete the level to save its best score and unlock the next one; retry or return to the menu after a collision.

Levels define the grid, start position and direction, movement interval, food target, initial food, obstacles, and optional paired portals. Level data is JSON and validated before it reaches gameplay code.

## Engine responsibilities

The engine owns the fixed-step runtime, scene lifecycle, entities, named input, event delivery, physics bodies, collision queries, camera math, configuration loading, shared randomness, and versioned local storage. The game layer composes those services.

The engine does not own Snake rules, level content, score policy, or progression. Snake's `GameManager` coordinates level flow, `LevelManager` reads and validates level definitions, `ProgressManager` records progress, and `GameUI` presents state and forwards player actions.

## Current implementation

- The browser opens into Snake Fantasy, with a menu, level selection, gameplay HUD, pause, retry, completion, and next-level flows.
- Five levels live in `data/snake/levels.json`; level validation checks IDs, movement values, grid positions, start cells, food types, and portal placement.
- Local progress uses the engine `SaveStore` and records total best score, per-level best scores, and the unlocked level.
- `CarRaceScene` and `SkyShooterScene` remain isolated engine consumers used for engine-level validation. They are not part of the Snake game menu or claimed as finished games.
- Automated checks cover runtime lifecycle, physics, input, level data, saving, Snake objectives, and the two secondary scene systems.

## Architecture rules

- Keep generic runtime services in `js/engine/` and all game rules in `js/games/`.
- Give every subsystem a narrow contract. Game flow coordinates systems; it does not implement their mechanics.
- Keep level and tuning values in data files, and validate them at load time.
- Keep UI responsible for presentation and player actions. It must not own snake movement, collisions, or progression rules.
- Keep save serialization generic. Game-specific progress shape belongs to `ProgressManager`.
- New games receive their own module and consume stable engine APIs; do not add game-specific branches to the runtime.
- Require unit tests for engine contracts and playthrough checks for game flows before calling a feature complete.

## Work stages

1. **Engine base.** Fixed-step loop, input, scene/entity lifecycle, 2D physics, event bus, seeded random source, configuration loader, save store, documentation, and tests.
2. **Snake release slice.** Five validated levels, food objectives, obstacles, portals, touch and keyboard controls, progression, local best scores, offline app shell, and menu/game lifecycle.
3. **Browser/device hardening.** Test full playthroughs in supported browsers and touch devices; tune collision feel, responsive layout, offline update behavior, and accessibility.
4. **New game modules.** Develop racing and shooting into actual games, with each game using engine contracts and owning its own content, UI, progression, and saves.
5. **Shared content services.** Add reusable asset loading, audio, animation, and richer level authoring only when a game requires those contracts. Keep them independently tested and documented.
