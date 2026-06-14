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
- One readable procedural survivor character with WASD movement, sprinting, touch joystick support, Xbox-style controller support, and a quick arcade jump.
- Survivor visual direction: red shirt or jacket, dark undershirt, blue pants, dark shoes, white/red/black cap, simple brown backpack, and wooden baseball bat. The survivor rises as a whole when jumping, tucks the legs slightly while airborne, and uses a small landing dip when returning to the ground.
- Multiple simple procedural zombie types that all chase the player directly.
- Automatic bat swing attack with a gold swing arc. The bat is a fixed close-range emergency weapon; damage and cooldown can improve, but range/area does not scale. Knockback Up is removed from the current level-up card pool.
- Special abilities are the primary ranged/offensive build system.
- XP gems, medkit health pickups, level-up upgrade cards, coins, pause, win screen, and loss screen.

## Movement and jump

- Base player and zombie movement speeds are tuned about **10% faster** than the previous stable feel so the town pace is slightly snappier without changing the 10-minute run clock, spawn cadence, cooldowns, XP curve, medkit timers, or damage tick timers.
- **Spacebar** or an Xbox-style controller **A** button starts a quick, modest arcade jump only while grounded. Holding the jump input does not repeat jumps in midair.
- The player keeps camera-relative steering while airborne, so pressing a new WASD direction during a jump changes the movement direction instead of locking the original takeoff direction.
- Jumping is currently a movement-feel feature only: it does not grant invincibility, stomp damage, dodge frames, or special combat rules. Bat swings and special abilities can still operate while jumping.
- Cars, buildings, and other town props still do not block movement in this pass. Obstacle collision remains planned for a later dedicated pass.

## Special ability system

Special abilities live in `src/abilities.js` and are designed as the active build-defining power set for each run. They are separate from passive run upgrades.

System rules:

- The long-term plan is **8 total special abilities**.
- A single run can unlock only **4 special abilities**.
- Each special ability has an `id`, display name, `maxLevel: 10`, and an `implemented` flag.
- Only abilities marked `implemented: true` can appear in the level-up card pool. Planned abilities must stay `implemented: false` until their behavior is built.
- Unlocking a special ability makes it **Level 1**.
- Each special ability upgrades from **Level 1 to Level 10**.
- Once a special ability reaches **Level 10**, it stops offering upgrade cards.
- If the player already has 4 chosen special abilities, level-up cards stop offering unlock cards for unchosen abilities.
- Already chosen special abilities can still offer upgrade cards until they reach Level 10.
- Ability upgrade cards raise that ability by one level, show the next level such as `Lv. 2/10`, and use the same zombie kill reward path as the bat so defeated zombies still drop XP.

### Implemented special abilities available now

Only these abilities should currently appear in the level-up card pool:

1. **Spinning Sawblade:** A bright low-poly spinning scrap disc that auto-launches on cooldown, targets roughly the nearest zombie, damages enemies it touches, and scales from Level 1-10 through modest damage, cooldown, hit-radius, speed/lifetime, and volley-count upgrades.
2. **Scrap Orbitals:** One or more visible low-poly scrap chunks orbit the player, spin automatically, and use contact/tick damage when orbiting chunks touch zombies. Scrap Orbitals scale from Level 1-10 through modest damage, orbital-count, orbital-speed, and hit-radius upgrades.
3. **Electric Zapper:** An automatic chain-zap special ability that fires on cooldown, hits the nearest zombie in range, then gains more damage, faster recharge, longer range, and extra chain targets as it upgrades from Level 1-10. Electric Zapper counts toward the 4 special ability limit and uses the normal zombie damage/death/reward path so kills still award XP and coins.
4. **Fire Bottle:** An automatic thrown area-damage special ability. It throws a small bottle toward the nearest zombie in range, or forward if no target is available, then creates a cartoon fire patch on the ground. Zombies in the patch take damage over time through the normal zombie damage/death/reward path. Fire Bottle counts toward the 4 special ability limit and upgrades from Level 1 to Level 10 through damage, duration, cooldown, radius, and extra-bottle improvements.

### Planned special abilities not available yet

These are roadmap entries only. They must not appear in gameplay or level-up cards until implemented later.

4. **Nail Blaster:** Shoots small nail/bolt projectiles at nearby zombies. Fast ranged damage. Can later gain extra projectiles and piercing.
5. **Shockwave Stomp:** Releases a timed shockwave around the player. Damages and pushes zombies back. Good panic/crowd-control ability.
6. **Bear Trap Toss:** Drops traps on the ground. Zombies that step on traps take damage and later can be slowed. Good for area control.
7. **Junkyard Turret:** Deploys a small scrap turret that shoots nearby zombies. Good for holding an area.

## Passive run upgrades

Passive run upgrades are normal level-up cards that improve the current run but do **not** count against the 4 special ability limit. They can keep appearing after the player has chosen 4 special abilities.

Current passive examples include:

- **Heavier Bat:** More bat damage.
- **Faster Swing / Quick Hands direction:** Bat and future special abilities recharge faster.
- **Quick Feet:** More movement speed.
- **Healthy Snack:** More max health and a small heal.

Future passive candidates, if added carefully later, include XP Magnet for larger pickup radius, Tough Jacket for damage reduction, and Lucky Loot for better drops or coin rewards.

## Future permanent coin upgrades

A later **Upgrade Lab** can appear before starting a run or after death/victory. It should use coins and save purchases in localStorage, but this shop is not part of the current pass. Planned permanent upgrade directions:

- **Power:** More starting damage.
- **Vitality:** More max health.
- **Swiftness:** More movement speed.
- **Recovery:** Slow health regeneration.
- **Endurance:** Stamina, jump, or sprint support later.
- **Greed:** More coins earned.
- **Magnetism:** Larger pickup radius.
- **Wisdom:** More XP gained.

## Bat design rule

The bat is the close-range emergency weapon. Its range/radius should stay fixed, and level-up pools should not add Bat Range or Bigger Swing upgrades. Ranged power and larger area control should come from special abilities instead of the bat.

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

- Expand the ability roster from 4 implemented abilities to 8 total choices while preserving the 4-per-run cap and Level 1-10 scaling.
- Give Spitter Zombies an isolated, easy-to-read projectile attack once the foundation is stable.
- More town props, barricades, rubble clusters, signs, and readable low-poly landmarks.
- Persistent cosmetic unlocks bought with coins.
- More arenas, weather effects, and ambient sound.
- Controller and touch controls.

## Controls

## Controller support

- Browser Gamepad API support targets standard Xbox-style controllers first, including Xbox 360-style desktop testing where the browser exposes a compatible mapping.
- **Left stick** moves the survivor using the same camera-relative movement system as keyboard WASD and the mobile joystick, with a deadzone to prevent drift and normalized diagonal movement.
- **Right stick** rotates camera yaw and adjusts pitch using the same clamp limits as mouse/touch camera controls.
- **A / button 0** jumps during gameplay and selects the highlighted level-up card when cards are open.
- **Start/Menu / button 9** pauses and resumes the current run when mapped by the browser/controller.
- **D-pad left/right** or left-stick left/right moves the controller highlight across level-up cards. Mouse and touch card selection remain supported.
- Controller mappings can vary by browser and hardware; if no gamepad is connected, keyboard, mouse, and touch input continue unchanged.

Desktop controls remain keyboard and mouse:

- **WASD**: Move camera-relative.
- **Shift**: Sprint.
- **Space**: Jump/hop.
- **Right mouse drag**: Orbit the camera.
- **Scroll**: Zoom the camera in or out.
- **P**, **Escape**, or an Xbox-style controller **Start/Menu** button: Pause or unpause. The on-screen pause button also pauses and resumes the current run without resetting timer progress, coins, zombies, pickups, or abilities.
- **M**: Toggle mute placeholder.

Mobile/touch controls are hidden on normal desktop/laptop screens and appear only for coarse-pointer touch layouts or small viewports:

- **Left virtual joystick**: Move the player camera-relative, including diagonal movement.
- **Right-side drag**: Orbit the camera with the same horizontal/vertical feel as mouse camera drag.
- **Two-finger pinch on the game canvas**: Smoothly zooms the camera closer or farther from the player, clamped to safe minimum and maximum distances and not saved permanently.
- **Lower-right JUMP button**: Triggers the same grounded jump as Spacebar and can be tapped while moving.
- **Level-up cards**: Large touch-safe card buttons; while the level-up overlay is open, touch controls do not move the player or rotate the camera.
- **Fullscreen buttons**: Mobile menu/gameplay buttons toggle browser fullscreen on and off and request landscape orientation where supported. Fullscreen is optional because mobile browsers cannot always hide the address bar; mobile web app meta tags and fullscreen requests simply help reduce browser chrome when available.
- **Pause button**: Pauses the run, timer, zombies, pickups, special abilities, fire patches/timed effects, player input, and camera touch controls until Resume/P/Escape is used.
- **Small phone portrait screens**: Show a rotate-phone overlay requiring landscape play. The overlay is a CSS/JS fallback and desktop controls remain unaffected.

## Win/loss condition

- Win by surviving until the timer reaches **10:00**.
- Lose if health reaches **0** before the timer finishes.
