# Amara's Fantacy: game and engine plan

## Story

David's efforts to bring their child home have led down endless paths without a result. Amara imagines herself as a river goddess with many forms. She takes serpent form to travel from the river source to the sea, awakening the Mist Weaver, Storm Heron, Moon Eel, and Sea Dragon powers on the way. At Victor's Tide Keep, she uses the sea's power to defeat him and bring her child home.

## Product direction

Amara's Fantacy is an offline-first browser game made with ES modules and Canvas. Snake is the playable form for the 50-chapter river journey. The engine is independent of the story and game rules, with later game modules able to use it without entering this game's menu.

## Snake game loop

1. Continue the current chapter or choose an unlocked chapter from the journey map.
2. Steer Amara's serpent with keyboard, swipe, or the direction pad.
3. Eat regular fruit, which persists until eaten and grows the serpent. Every fifth regular fruit brings a timed special fruit worth 5× the fifth fruit's points; it gives no growth or objective progress, and missing it only forfeits the bonus points.
4. Complete the chapter's regular-fruit objective, earn a score medal, and unlock the next chapter. Later chapters ask for more fruit and move the serpent faster.
5. Reach the open sea, confront Victor, and reunite Amara with her child in the final chapter.

Chapter data defines starting position and direction, speed, objective, fruit placement, visible rocks, and paired current gates. The level loader validates the complete campaign before play.

## Engine responsibilities

The engine owns the fixed-step runtime, scene lifecycle, entities, named input, event delivery, physics bodies, collision queries, camera math, configuration loading, shared randomness, and versioned local storage. Game modules own game rules, content, scoring, and progression.

Amara's `GameManager` coordinates chapter flow, `LevelManager` validates campaign content, `ProgressManager` records scores and unlocks, and `GameUI` presents state. `SnakeScene` owns grid movement, fruit rules, collision, and rendering.

## Current implementation

- First run presents the developer/game brand boot screen, icon-only loading scene, game menu, level-specific story scene, and a guided first-level tutorial before normal play.
- The game menu, chapter map, game HUD, pause, retry, chapter-completion, and final-story screens support the campaign loop.
- Amara's portrait from Save The Baby is reused in the local serpent emblem and story scene.
- Fifty chapters strictly increase both regular-food goals (6 to 67) and speed (157 ms to 90 ms per move).
- The five story arcs name Amara's changing goddess forms as she travels toward the sea.
- Special fruit appears after five regular fruit, lasts only for its configured window, gives 5× the fifth regular fruit's points, and has no effect on growth or chapter completion.
- Local art, five WAV effects, keyboard and touch input, offline caching, and persistent scores and unlocks are included.
- Car-racing and sky-shooter scenes remain isolated engine consumers; they are not presented as finished games.

## Next work

1. Exercise all five chapter arcs in a browser at desktop and mobile sizes; verify rocks and portal gates are visually aligned with their collision cells.
2. Tune level layouts and steering feel during real play, especially the faster late chapters.
3. Build any later game as an independent engine consumer with its own product loop and content.
