# Rival Cutscene Assets

Place per-rival pre-race (`intro`) and post-race (`outro`) cutscene media files (`.mp4`, `.webm`, `.png`, `.jpg`, `.webp`) in this directory, then set the corresponding `mediaPath` inside `RIVALS[].cutscenes` in `src/config.js`.

## Recommended Filenames

| Rival | Pre-Race Cutscene (`intro`) | Post-Race Cutscene (`outro`) |
| :--- | :--- | :--- |
| **TAKESHI** (`takeshi`) | `assets/cutscenes/takeshi_intro.*` | `assets/cutscenes/takeshi_outro.*` |
| **KEISUKE** (`keisuke`) | `assets/cutscenes/keisuke_intro.*` | `assets/cutscenes/keisuke_outro.*` |
| **RYOSUKE** (`ryosuke`) | `assets/cutscenes/ryosuke_intro.*` | `assets/cutscenes/ryosuke_outro.*` |
| **BUNTA** (`bunta`) | `assets/cutscenes/bunta_intro.*` | `assets/cutscenes/bunta_outro.*` |

When `mediaPath` is `null` (default), the game displays a placeholder cutscene stage with `SKIP [ESC]` / `CONTINUE [ENTER]` controls so gameplay flow remains uninterrupted.
