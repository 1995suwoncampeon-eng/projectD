# Custom 3D Vehicle Models (`.glb`)

Place your custom 3D car models in this directory using the exact filenames below:

- `assets/models/player_car.glb` — Player vehicle
- `assets/models/rival_car.glb` — Default rival vehicle (fallback for rivals without a dedicated model)
- `assets/models/Bongo.glb` — TAKESHI (`EASY`) rival vehicle
- `assets/models/Mohavi.glb` — BUNTA (`GOD`) rival vehicle

Per-rival paths and orientations (`modelPath`, `modelRotationY`) are configured in `RIVALS` inside `src/config.js`.

## Automatic Normalization
When loaded via `GLTFLoader` in `src/carModel.js`:
1. The model is rotated around the Y axis by `MODEL_ROTATION_Y` (defined at the top of `src/config.js` and re-exported from `src/carModel.js`).
2. `THREE.Box3` measures the bounding box and uniformly scales the vehicle so its width matches `TARGET_CAR_WIDTH` (`2.15` meters, proportioned to the `13.5`m mountain pass road).
3. The model is automatically centered on `X/Z` and grounded so its lowest point (`box.min.y`) rests flush on the road (`y = 0`).

## Adjusting Forward Axis
If your `.glb` model appears backwards or sideways in-game, edit `MODEL_ROTATION_Y` at the top of `src/config.js`:
- `0` — model faces `+Z`
- `Math.PI` — model faces `-Z`
- `Math.PI / 2` — model faces `-X`
- `-Math.PI / 2` — model faces `+X`

## Automatic Fallback
If either `.glb` file is missing or fails to load, the game automatically renders a stylized low-poly 3D sports car (including headlights and brake/taillights) so gameplay continues seamlessly without interruption.
