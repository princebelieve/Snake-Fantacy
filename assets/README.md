# Artwork inventory

The supplied artwork has been grouped by purpose and renamed for reuse.

- `art/amara-title.png`: illustrated title-screen character and lettering. The PNG includes transparency; the game preserves the original art.
- `art/stone-arena.jpg`: empty stone arena. Its border frames the canvas; a floor tile is sampled onto the actual 24 × 16 gameplay grid so the reference grid cannot suggest incorrect cell positions.
- `sprites/apple.png`, `river-fish.png`, `water-orb.png`: regular offerings. They retain the existing apple/berry/golden scoring tiers (10/15/25 points). The asset loader trims transparent padding into small runtime drawing surfaces; originals remain full resolution.
- `sprites/bonus-star.png`: preserved source art with a painted x2 label. The five-times timed bonus uses `sprites/lightning.png` so its artwork does not display a conflicting multiplier.
- `sprites/lightning.png`: timed bonus collectible. `sprites/shield.png`: preserved reference for future shield mechanics.
- `references/`: title variations, arena concepts, and maze layouts/solutions. These are not loaded into gameplay or the offline cache. Painted obstacles do not create gameplay collisions.

The new presentation lives in `css/game-stage.css`, layered after the original UI styles. No remote fonts, image services, or CDNs are needed.

## Supplied character artwork is now used in gameplay

`sprites/amara-serpent-atlas.png` contains Amara's human head, emerald-and-gold straight body, a bend, and a tapered tail. It replaces the old generic head and segment sprites. It was prepared using the built-in imagegen tool from the supplied `image_20261110_130813.jpg`, `image_20261110_130810.jpg`, and `image_20261110_130808_1.jpg`. The source files remain untouched in the main assets folder.

Generation prompt: edit the supplied head, body, and tail into a transparent, uniform 2-by-2 atlas; upright recognizable Amara head at top left; horizontal emerald-and-gold body at top right; matching left-to-bottom bend at bottom left; horizontal tapered tail with thick left end and right-facing tip at bottom right. Preserve the supplied character and scale design, remove black backgrounds, and include no text or quadrant dividers.

The timed bonus now uses the supplied lightning artwork, preserving the existing five-times scoring rule. The x2 star remains available as source art and is not used for a five-times bonus. Amara's supplied transparent serpent portrait appears in the loading and story screens. Original transparent assets are also restored under their original names in the main assets folder.

Portrait devices transpose the chapter grid and all its coordinates together, preserving collision rules while filling the phone screen. The supplied forest arena frames the board; the playable floor uses a texture sampled from the stone arena and an aligned game grid. Chapter progression and regular-food growth rules remain intact.
