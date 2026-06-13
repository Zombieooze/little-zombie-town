# Little Zombie Town Game Design

## Core loop

1. Start a ten-minute run from the main menu.
2. Move around a larger ruined town arena while zombies spawn at the edges.
3. Let automatic fixed-range baseball bat swings clear nearby zombies in emergencies.
4. Collect dropped XP gems from every defeated zombie.
5. Grab medkits as the basic healing system when damage starts to pile up.
6. Level up, choose one of three upgrade cards, and build around passives plus special abilities.
7. Earn coins during the run, then save them locally when the run ends.

## First version scope

- Static browser game with no build system or backend.
- Procedural low-poly town using basic Three.js geometry.
- One readable procedural survivor character with WASD movement and sprinting.
- Survivor visual direction: red shirt or jacket, dark undershirt, blue pants, dark shoes, white/red/black cap, simple brown backpack, and wooden baseball bat.
- Multiple simple procedural zombie types that all chase the player directly.
- Automatic bat swing attack with a gold swing arc. The bat is a fixed close-range emergency weapon; damage and cooldown can improve, but range/area does not scale. Knockback Up is removed from the current level-up card pool.
- Special abilities are the primary ranged/offensive build system.
- XP gems, medkit health pickups, level-up upgrade cards, coins, pause, win screen, and loss screen.

## Special ability system

Special abilities live in `src/abilities.js` and are designed as a clean foundation for future additions.

- The long-term plan is **8 total special abilities**.
- A single run can unlock only **4 special abilities**.
- Each special ability has **Level 1-10** scaling with a max level of 10.
- Unlocking a special ability makes it **Level 1**.
- If the player already has 4 chosen special abilities, level-up cards should stop offering unlock cards for unchosen abilities.
- Once an ability is unlocked, only chosen abilities appear for further ability upgrade cards.
- Ability upgrade cards raise that ability by one level, show the next level such as `Lv. 2/10`, and stop appearing once the ability reaches Level 10.
- Ability definitions own their unlock text, level-up text, default tuning, cooldowns/timers, update behavior, zombie damage, and simple low-poly visual effects.
- Ability kills still use the same reward path as bat kills, so every defeated zombie continues to drop XP.

### First implemented test abilities

- **Spinning Sawblade:** A bright low-poly spinning scrap disc that auto-launches on cooldown, targets roughly the nearest zombie, damages enemies it touches, and scales from Level 1-10 through modest damage, cooldown, hit-radius, speed/lifetime, and volley-count upgrades.
- **Scrap Orbitals:** One or more visible low-poly scrap chunks orbit the player, spin automatically, and use contact/tick damage when orbiting chunks touch zombies. Scrap Orbitals scale from Level 1-10 through modest damage, orbital-count, orbital-speed, and hit-radius upgrades.

## Current prototype target

- Survive **10 minutes** in a noticeably larger arena than the earliest prototype.
- Keep the first playable loop approachable: enemies pressure the player, but there is enough room to kite zombies and collect XP.
- Use increased late-run spawn pressure plus light enemy health and damage scaling so the 10-minute test stays tense after the player levels up.
- Use simple browser-friendly geometry only: boxes, cylinders, spheres, cones, low-poly primitives, flat colors, and no imported models or textures.

## Healing and pickups

Medkits are the current basic healing system. They use simple low-poly red boxes with white crosses so they stay readable on the ground without external textures.

- A collected medkit heals a fixed amount while clamping the player to max health.
- Every defeated zombie still drops its XP gem. Medkits are an extra rare drop and never replace XP.
- Drop chances live near zombie type tuning: Walkers are rare, Runners/Little Zombies and Spitters are slightly more likely, and Brutes/Crushers/Mini Bosses are more rewarding without replacing XP drops.
- World medkits begin appearing around **0:45**, then occasionally respawn near—but not directly on—the player, with small world and total active caps so healing remains helpful without flooding the arena.

## Zombie progression

Zombie tuning lives in `src/config.js` so health, speed, damage, XP, coins, size, spawn weight, unlock time, and unlock level are easy to adjust.

- **0:00 to 1:30 / levels 1-2:** Walker Zombies are the default threat.
- **1:30+ or level 3+:** Little Runner Zombies join as smaller, faster, lower-health chasers.
- **3:00+ or level 5+:** Brute Zombies join as larger, slower, high-health chasers with stronger contact damage.
- **5:00+ or level 6+:** Spitter Zombies join as toxic-colored visual variants; for now they still chase directly instead of firing projectiles.
- **6:00+ or level 9+:** Crusher Zombies enter as late-game heavy chasers between Brutes and the Mini Boss.
- **7:30+ or level 11+:** Mini Boss Zombies can spawn rarely, capped to about one or two bosses for the 10-minute test.

Spawn pressure increases over the run: spawn delays shrink gradually, the active horde cap rises, and later zombie type weights become more prominent after they unlock, with extra late pressure on heavy enemies after minute five. Enemy health scales slowly by elapsed minutes and contact damage scales even more lightly, keeping the opening approachable while preventing the late run from becoming too easy. XP rewards also gain a modest time-based multiplier after minute five, and level XP growth softens after level 10, so upgrades keep feeding through the full 10-minute run. Strong successful play should trend closer to level 24-30 instead of stalling near the high teens.

## Zombie type roles

- **Walker Zombie:** Medium green skin, dull blue shirt, normal size, baseline health, speed, contact damage, XP, and coins.
- **Little/Runner Zombie:** Smaller body, purple accent, faster speed, lower health, and slightly higher XP than a walker.
- **Brute Zombie:** Larger chunky body, brown/dark torso, slow speed, high health, higher contact damage, and stronger XP/coin rewards.
- **Spitter Zombie:** Medium body with toxic green accent and a larger throat/head silhouette; currently behaves as a normal chaser with higher XP.
- **Crusher Zombie:** Bigger than a Brute but smaller than the Mini Boss, with a rusty heavy torso, wide shoulders, more health and damage than a Brute, and a 4x-5x walker XP reward.
- **Mini Boss Zombie:** Very large zombie with a dark torso, bigger arms, simple crown/spike cones, high health, slow speed, and a large XP/coin reward.

## Future ideas

- Expand the ability roster from 2 test abilities to 8 total choices while preserving the 4-per-run cap and Level 1-10 scaling.
- Give Spitter Zombies an isolated, easy-to-read projectile attack once the foundation is stable.
- More town props, barricades, rubble clusters, signs, and readable low-poly landmarks.
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
