# Rival Cutscene Character Portraits & Dialogue

Place character portrait images (`.png`, `.webp`, `.jpg`) in this directory and configure `characterImage` / `lines` inside `RIVALS[].cutscenes` in `src/config.js`.

## Recommended Portrait Filenames

| Rival | Default Portrait | Optional Per-Line Expression Override |
| :--- | :--- | :--- |
| **TAKESHI** (`takeshi`) | `assets/cutscenes/takeshi.png` | `line.image: 'assets/cutscenes/takeshi_angry.png'` |
| **KEISUKE** (`keisuke`) | `assets/cutscenes/keisuke.png` | `line.image: 'assets/cutscenes/keisuke_smirk.png'` |
| **RYOSUKE** (`ryosuke`) | `assets/cutscenes/ryosuke.png` | `line.image: 'assets/cutscenes/ryosuke_calm.png'` |
| **BUNTA** (`bunta`) | `assets/cutscenes/bunta.png` | `line.image: 'assets/cutscenes/bunta_smoke.png'` |

Each cutscene (`intro` / `outro`) contains a `lines` array of `{ speaker, color, image, text }` paragraphs that play with a typewriter effect and advance on clicking the dialogue box (or pressing `Enter` / `Space`).
