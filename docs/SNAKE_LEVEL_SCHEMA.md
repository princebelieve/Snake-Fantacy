# Amara's Fantacy campaign data

`data/snake/levels.json` stores the 50 chapters, rising Snake objectives, special-fruit rules, and five story arcs. `LevelManager` validates it before play.

```json
{
  "game": "amaras-fantacy",
  "version": 3,
  "grid": { "columns": 24, "rows": 16, "minimumTile": 12 },
  "foodTypes": [{ "type": "apple", "points": 10, "color": "#ff806b", "asset": "apple" }],
  "specialFruit": { "type": "special-fruit", "asset": "bonus", "afterRegularFoods": 5, "multiplier": 5, "durationSeconds": 9 },
  "story": { "prologue": "...", "arcs": [], "ending": "..." },
  "levels": [{
    "id": 1,
    "name": "River's First Whisper",
    "difficulty": "Gentle",
    "stepMs": 157,
    "targetFoods": 6,
    "targetScore": 84,
    "specialDurationSeconds": 10,
    "start": { "x": 3, "y": 8 },
    "direction": "right",
    "initialLength": 3,
    "foods": [{ "x": 14, "y": 4, "type": "apple" }],
    "obstacles": [],
    "portals": []
  }]
}
```

## Fields

- `game`, `version`, and `grid` identify the game schema and logical board.
- `foodTypes` maps regular fruit identifiers to points, colors, and sprites.
- `specialFruit.afterRegularFoods` is five. Its `multiplier` is five; `durationSeconds` supplies the default visibility window. Each level can tune the window with `specialDurationSeconds`.
- Special-fruit points equal five times the fifth regular fruit's points. Special fruit does not grow Amara's serpent or count toward `targetFoods`. Expiry removes only the special fruit and its possible points.
- `story.prologue`, `story.arcs`, and `story.ending` hold Amara's fantasy, five transforming goddess forms, and the sea finale.
- Each level has a consecutive `id`, display name, difficulty, integer `stepMs`, and regular-food goal (`targetFoods`). Across the campaign, goals rise from 6 to 67 and movement intervals fall from 157 ms to 90 ms.
- `targetScore` is based on regular-fruit points for the chapter medal; special-fruit points do not affect it.
- `start`, `direction`, and optional `initialLength` define the serpent's starting pose. `foods` supplies deterministic initial regular-fruit placements; later regular fruit is selected from free cells and never expires.
- `obstacles` are visible rocks on blocked cells. `portals` is empty or contains a paired current gate. Their sprites and collision cells must share the same grid-to-canvas position.

The validator checks chapter IDs, increasing game tuning in the authored campaign, timing and objective values, cell bounds, food types, starting-body overlap, rock placement, and paired current gates.
