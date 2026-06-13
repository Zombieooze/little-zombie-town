# Little Zombie Town Game Design

## Core loop

1. Start a five-minute run from the main menu.
2. Move around a larger ruined town arena while walker zombies spawn at the edges.
3. Let automatic fixed-range baseball bat swings clear nearby zombies.
4. Collect dropped XP gems and rare health pickups.
5. Level up, choose one of three upgrade cards, and keep surviving.
6. Earn coins during the run, then save them locally when the run ends.

## First version scope

- Static browser game with no build system or backend.
- Procedural low-poly town using basic Three.js geometry.
- One readable procedural survivor character with WASD movement and sprinting.
- Survivor visual direction: red shirt or jacket, dark undershirt, blue pants, dark shoes, white/red/black cap, simple brown backpack, and wooden baseball bat.
- One enemy type: Walker Zombie.
- Automatic fixed-range bat swing attack with a gold swing arc; upgrades can improve damage, cooldown, movement, health, and knockback, but the bat radius/range should not grow over time.
- Rare health pickups can drop from defeated zombies, and a few occasional world medkits can spawn around the map.
- XP gems, level-up upgrade cards, coins, pause, win screen, and loss screen.

## Current prototype target

- Survive **5 minutes** in a noticeably larger arena than the earliest prototype.
- Keep the first playable loop approachable: enemies pressure the player, but there is enough room to kite zombies and collect XP.
- Use simple browser-friendly geometry only: boxes, cylinders, spheres, cones, low-poly primitives, flat colors, and no imported models or textures.

## Future ideas

- More zombie types and themed waves using the same simple geometry style.
- More town props, barricades, rubble clusters, signs, and readable low-poly landmarks.
- New weapons such as bottle rockets, spooky lanterns, and toy turrets.
- Persistent cosmetic unlocks bought with coins.
- More arenas, weather effects, and ambient sound.
- Controller and touch controls.

## Controls

- **WASD**: Move.
- **Shift**: Sprint.
- **Space**: Short hop.
- **Mouse drag**: Orbit the camera around the player.
- **Mouse wheel**: Zoom the camera within safe limits.
- **P**: Pause or unpause.
- **M**: Toggle mute placeholder.

## Win/loss condition

- Win by surviving until the timer reaches **5:00**.
- Lose if health reaches **0** before the timer finishes.
