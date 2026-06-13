# Little Zombie Town

Little Zombie Town is a tiny browser-based arcade survival game built with plain HTML, CSS, JavaScript modules, and Three.js from a CDN. Survive a cartoon ruined town for three minutes while cute-spooky walker zombies chase you.

## How to run locally

Because the game uses JavaScript modules, run it from a local static server instead of opening the file directly:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Hosting with GitHub Pages

1. Push this repository to GitHub.
2. Open the repository settings.
3. Go to **Pages**.
4. Select the branch containing these static files and use the repository root as the source.
5. Save and open the generated GitHub Pages URL.

No backend, build step, npm install, database, or framework is required.

## Controls

- **WASD**: Move
- **Shift**: Sprint
- **P**: Pause or unpause
- **M**: Toggle mute placeholder

## Goal

Survive until the timer reaches **3:00**. Defeat zombies with automatic defense pulses, collect XP gems, pick upgrades, and earn coins that are saved in your browser with `localStorage`.
