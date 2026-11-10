# Snake level data

Level definitions are stored in `data/snake/levels.json`. `LevelManager` validates the file before gameplay uses it.

```json
{
  "game": "snake-fantasy",
  "version": 1,
  "grid": { "columns": 24, "rows": 16, "minimumTile": 12 },
  "foodTypes": [
    { "type": "apple", "points": 10, "color": "#ff806b" }
  ],
  "levels": [
    {
      "id": 1,
      "name": "First Trail",
      "difficulty": "Easy",
      "stepMs": 155,
      "targetFoods": 5,
      "start": { "x": 5, "y": 8 },
      "direction": "right",
      "foods": [{ "x": 10, "y": 8, "type": "apple" }],
      "obstacles": [],
      "portals": []
    }
  ]
}
```

## Fields

- `game` and `version` identify the document format.
- `grid.columns` and `grid.rows` define the logical board. `minimumTile` is the smallest rendered cell size in CSS pixels.
- `foodTypes` defines the allowed food identifiers, points, and colors. New types can be added here without editing Snake movement.
- `levels` must use consecutive IDs beginning at 1. Each level has a display name/difficulty, a movement interval in milliseconds, and a positive `targetFoods` count.
- `start` is the initial head cell; `direction` is `up`, `down`, `left`, or `right`. The starting snake has three cells unless `initialLength` is provided.
- `foods` gives deterministic initial food placements. After those are consumed, remaining food is placed in free cells using the engine random source.
- `obstacles` is an array of blocked grid cells.
- `portals` is empty or contains exactly two distinct cells. Entering either cell exits at the other.

The validator rejects out-of-grid content, invalid movement intervals, unknown food types, blocked starts, food placed inside the initial snake/obstacles/portals, and malformed portal pairs. Level goals, obstacles, portals, speed, and food values are data; snake movement and collision rules remain in `SnakeScene`.
