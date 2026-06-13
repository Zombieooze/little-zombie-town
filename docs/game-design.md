# Little Zombie Town Game Design

## Core loop

1. Start a ten-minute run from the main menu.
2. Move around a larger ruined town arena while zombies spawn at the edges.
3. Let automatic baseball bat swings clear nearby zombies.
4. Collect dropped XP gems from every defeated zombie.
5. Level up, choose one of three upgrade cards, and keep surviving.
6. Earn coins during the run, then save them locally when the run ends.

## First version scope

- Static browser game with no build system or backend.
- Procedural low-poly town using basic Three.js geometry.
- One readable procedural survivor character with WASD movement and sprinting.
- Survivor visual direction: red shirt or jacket, dark undershirt, blue pants, dark shoes, white/red/black cap, simple brown backpack, and wooden baseball bat.
- Multiple simple procedural zombie types that all chase the player directly.
- Automatic bat swing attack with a gold swing arc; existing range, damage, and cooldown upgrades continue to drive the attack stats.
- XP gems, level-up upgrade cards, coins, pause, win screen, and loss screen.

## Current prototype target

- Survive **10 minutes** in a noticeably larger arena than the earliest prototype.
- Keep the first playable loop approachable: enemies pressure the player, but there is enough room to kite zombies and collect XP.
- Use simple browser-friendly geometry only: boxes, cylinders, spheres, cones, low-poly primitives, flat colors, and no imported models or textures.

## Zombie progression

Zombie tuning lives in `src/config.js` so health, speed, damage, XP, coins, size, spawn weight, unlock time, and unlock level are easy to adjust.

- **0:00 to 1:30 / levels 1-2:** Walker Zombies are the default threat.
- **1:30+ or level 3+:** Little Runner Zombies join as smaller, faster, lower-health chasers.
- **3:00+ or level 5+:** Brute Zombies join as larger, slower, high-health chasers with stronger contact damage.
- **4:00+ or level 6+:** Spitter Zombies join as toxic-colored visual variants; for now they still chase directly instead of firing projectiles.
- **7:00+ or level 8+:** A Mini Boss Zombie can spawn rarely, limited to one boss per run for the 10-minute test.

## Zombie type roles

- **Walker Zombie:** Medium green skin, dull blue shirt, normal size, baseline health, speed, contact damage, XP, and coins.
- **Little/Runner Zombie:** Smaller body, purple accent, faster speed, lower health, and slightly higher XP than a walker.
- **Brute Zombie:** Larger chunky body, brown/dark torso, slow speed, high health, higher contact damage, and stronger XP/coin rewards.
- **Spitter Zombie:** Medium body with toxic green accent and a larger throat/head silhouette; currently behaves as a normal chaser with higher XP.
- **Mini Boss Zombie:** Very large zombie with a dark torso, bigger arms, simple crown/spike cones, high health, slow speed, and a large XP/coin reward.

## Future ideas

- Give Spitter Zombies an isolated, easy-to-read projectile attack once the foundation is stable.
- More town props, barricades, rubble clusters, signs, and readable low-poly landmarks.
- New weapons such as bottle rockets, spooky lanterns, and toy turrets.
- Persistent cosmetic unlocks bought with coins.
- More arenas, weather effects, and ambient sound.
- Controller and touch controls.

## Controls

- **WASD**: Move camera-relative.
- **Shift**: Sprint.
- **Space**: Jump/hop, if available.
- **Right mouse drag**: Orbit the camera.
- **Scroll**: Zoom the camera in or out.
- **P**: Pause or unpause.
- **M**: Toggle mute placeholder.

## Win/loss condition

- Win by surviving until the timer reaches **10:00**.
- Lose if health reaches **0** before the timer finishes.
