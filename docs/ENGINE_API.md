# Engine contracts

This document defines the shared contracts consumed by Amara's Fantacy and future game modules.

## Runtime and scene ownership

`GameRuntime` owns one canvas, one fixed-step update loop, one input service, one physics world, one event bus, and one random source. It exposes `setScene`, `start`, `pause`, `resume`, `stop`, `render`, and `destroy`.

`GameScene` owns scene entities and provides `onEnter(runtime)`, `onUpdate(dt, runtime)`, `onRender(ctx, alpha, runtime)`, `onExit(runtime)`, and `resize(width, height, runtime)`. Scene code owns game rules; the runtime only drives lifecycle and shared services. Switching scenes exits the previous scene, clears its physics bodies, resets virtual input, and enters the new scene.

`GameEntity` wraps game-specific position, render/update callbacks, render layer, tag, and optional `PhysicsBody`. A game may instead implement mechanics using discrete coordinates, as Snake does.

## Input and events

`Input.bind(action, keyCodes)` defines named button actions. `bindAxis(name, negativeKeys, positiveKeys)` defines a -1 to 1 axis. `isDown`, `wasPressed`, and `wasReleased` provide frame-aware state. Touch controls can use `trigger`, `setVirtualDown`, and `setAxis`.

`SignalBus.on(name, callback)` returns an unsubscribe function. `once`, `off`, `emit`, and `clear` complete its event contract. Runtime lifecycle events use `scene:exiting`, `scene:entered`, `runtime:paused`, `runtime:resumed`, and `runtime:destroyed`.

## Physics and camera

`PhysicsWorld` uses pixel coordinates and pixel-per-second velocities. `PhysicsBody` types are `static`, `kinematic`, and `dynamic`. Dynamic bodies receive gravity, forces, impulses, friction, and solid AABB resolution against static or kinematic bodies. Fast crossings of thin AABB obstacles are detected. Moving-body pairs can be queried using `overlaps` and `queryAABB` and resolved by game-specific rules.

`MovementController` provides platformer, top-down, and auto-runner policies. Games may implement custom movement, such as steering and throttle. `Camera2D` supplies zoom, follow smoothing, view transforms, and screen/world coordinate conversion; a scene chooses when to apply it.

## Configuration, randomness, and saves

`JsonConfigLoader.load(url, { validate })` fetches and memoizes JSON, returns a copy, and rejects invalid data. The service worker provides cached responses while offline.

`RandomGenerator` is a seedable shared source with `next`, `integer`, `pick`, and `shuffle`. A game can retain a seed to reproduce a run or level generation.

`SaveStore(namespace, { version, storage, migrate })` stores versioned, namespaced data. It handles storage and JSON serialization only. The game-specific `ProgressManager` owns the meaning and validation of Snake progress fields.

## Snake game boundaries

- `GameManager` coordinates boot, menu, level, pause, retry, completion, and progression flow.
- `LevelManager` loads and validates `data/snake/levels.json`; it owns no runtime snake state.
- `ProgressManager` owns best scores and unlocked level state, persisting through `SaveStore`.
- `SnakeScene` owns grid movement, food collection, obstacles, portals, wall/self collisions, and its board visuals.
- `GameUI` renders menu/HUD/overlays and forwards actions; it does not change game rules.

## Adding a game

Create a module under `js/games/<game>/`. Give it its own scene and game-specific flow/configuration. Use `GameRuntime`, `GameScene`, `GameEntity`, input, physics, camera, and persistence services as needed. Keep game content outside generic engine modules. Run the engine/game tests and add a complete playthrough check for the new game.
