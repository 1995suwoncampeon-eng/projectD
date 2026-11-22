# Project D — Touge Downhill 1v1 Arcade Racing Game Specification

## 1. Overview
**Project D** is a simplified, fast-paced 1v1 mountain pass (Touge downhill) web arcade racing game inspired by *Initial D Arcade Stage*. It runs purely on static files (`index.html`, `styles.css`, `src/*.js`) with zero build tools and no backend dependencies so it can be opened directly via any static HTTP server or embedded inside a Unity WebView.

---

## 2. Technical Constraints & Architecture
- **Zero Build Pipeline**: Pure native ES Modules (`<script type="module">`) with an `<script type="importmap">` loading `Three.js` (`0.169.0`) and `GLTFLoader` from CDN (`cdn.jsdelivr.net`).
- **Static & WebView-Ready**: No external backend, no required external fonts/APIs, defensive `localStorage` access (wrapped in `try/catch`).
- **3D Cars + Clean 2.5D/Flat Night Touge**:
  - Vehicles load via `GLTFLoader` from:
    - `assets/models/player_car.glb`
    - `assets/models/rival_car.glb`
  - Automatic bounding-box normalization via `THREE.Box3` to match road width (`TARGET_CAR_WIDTH`) and sit flush at `y = 0`.
  - Forward-axis orientation constant `MODEL_ROTATION_Y` exposed prominently at the top of `src/config.js` (and re-exported by `src/carModel.js`).
  - Automatic graceful fallback to a stylized low-poly 3D sports car (with headlights, brake/taillights, spoiler, cabin, and wheels) if `.glb` files are missing or fail to load.
- **2D Planar Physics (`X, Z`)**:
  - All vehicle motion, track projection, guardrail boundaries, and car-to-car collisions operate strictly on the `Y = 0` plane to prevent flipping, tunneling, or terrain bugs.

---

## 3. Core Game Flow & Features

### 3.1 Screen Flow
1. **Title Screen (`TITLE`)**: Live 3D night touge attract-mode backdrop + arcade title & Start trigger.
2. **Rival Select Screen (`SELECT`)**: Choose from 3 rivals with distinct difficulty, color, top speed, and cornering stability, with live 3D preview.
3. **Countdown (`COUNTDOWN`)**: Cars grid up side-by-side at the Start Gantry (`3 - 2 - 1 - GO!`).
4. **1v1 Race (`RACING`)**: Point-to-point downhill mountain pass (~2,200m) with sweeping S-curves and hairpins.
5. **Result Screen (`RESULT`)**: Displays Win/Lose outcome, elapsed time, gap to rival, max speed, and options to **Retry** (`다시하기`) or **Select Rival** (`라이벌 다시 선택`).

### 3.2 Rivals (3 Tiers)
| Tier | Name | Team | Color | Top Speed | Cornering Stability | Profile |
| --- | --- | --- | --- | --- | --- | --- |
| 초급 (EASY) | TAKESHI | NIGHT KIDS | Cobalt Blue (`#2563eb`) | 176 km/h | 78% | Early braking, forgiving pace |
| 중급 (NORMAL) | KEISUKE | RED SUNS | Turbo Yellow (`#facc15`) | 196 km/h | 89% | Strong acceleration, balanced drift lines |
| 고수 (HARD) | RYOSUKE | WHITE COMET | Pearl White (`#e2e8f0`) | 212 km/h | 97% | High apex speed, precision cornering |

### 3.3 Controls & Physics
- `W` / `ArrowUp`: Accelerate
- `S` / `ArrowDown`: Brake / Reverse
- `A` / `ArrowLeft`: Steer Left
- `D` / `ArrowRight`: Steer Right
- `Space`: Arcade Drift (enhances yaw turn-in, adds visual slip angle, spawns tire skid marks & sparks, awards slight exit boost)
- `R`: Track Recovery (resets car cleanly onto the track centerline facing forward)
- `M`: Toggle synthesized Web Audio SFX

### 3.4 HUD (Arcade Stage Style)
- **Bottom Right**: Digital speedometer (`km/h`), current gear (`1–5`), segmented RPM bar with redline flash, drift status badge.
- **Top Center**: Distance gap to rival (`+12m` / `-8m`), position badge (`1ST` / `2ND`), course progress bar + remaining distance, elapsed time (`MM:SS.cc`).
- **Top Left**: 2D Canvas Minimap displaying full course geometry, finish marker, and real-time Player / Rival positions.

---

## 4. Planned File Structure
- `SPEC.md` — Project specification & checklist
- `index.html` — Entry HTML, CDN importmap, arcade UI overlays
- `styles.css` — Dark neon arcade styling & responsive HUD layout
- `assets/models/README.md` — Placement & orientation guide for `.glb` vehicle models
- `src/config.js` — `MODEL_ROTATION_Y`, model paths, rival definitions, track/physics constants
- `src/track.js` — 2D spline touge generator, arc-length lookup, curvature, projection & boundary math
- `src/trackRenderer.js` — 2.5D/3D night touge mesh builder (asphalt, center line, guardrails, chevrons, streetlamps, gantries, night sky)
- `src/carModel.js` — `GLTFLoader` + `THREE.Box3` normalizer + low-poly fallback sports car builder
- `src/physics.js` — 2D `(X, Z)` arcade driving & drift physics, guardrail & car-to-car collision, `R` recovery
- `src/ai.js` — Waypoint-following rival AI with corner anticipation and rubber-banding
- `src/effects.js` — Drift skid marks, sparks, and exhaust/drift visual feedback
- `src/audio.js` — Lightweight Web Audio API synthesized arcade SFX
- `src/hud.js` — Speedometer, gear/RPM, gap/progress/timer, and 2D minimap rendering
- `src/ui.js` — Title, Rival Select, Countdown, and Result screen controller
- `src/main.js` — Scene orchestration, chase/attract cameras, input handling, and game loop

---

## 5. Implementation Checklist
- [x] **Step 0**: Author `SPEC.md` and commit specification.
- [x] **Step 1**: Base static entry (`index.html`, `styles.css`, `src/config.js`, `assets/models/README.md`).
- [ ] **Step 2**: Track system (`src/track.js`, `src/trackRenderer.js`) — 2D downhill spline & night touge visuals.
- [ ] **Step 3**: 3D Car loader & fallback (`src/carModel.js`) — `GLTFLoader`, `THREE.Box3` normalization, `MODEL_ROTATION_Y`, low-poly fallback sports car.
- [ ] **Step 4**: 2D Arcade Physics, Rival AI & Drift Effects (`src/physics.js`, `src/ai.js`, `src/effects.js`, `src/audio.js`).
- [ ] **Step 5**: Arcade HUD, Screen Flow & Main Game Loop (`src/hud.js`, `src/ui.js`, `src/main.js`).
- [ ] **Step 6**: Browser E2E verification via local HTTP server (Title → Rival Select → Countdown → Driving/Drift/Reset → Finish/Result → Retry/Select, both Fallback and GLB loading paths) and bug fixes.
