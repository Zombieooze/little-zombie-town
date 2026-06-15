# Little Zombie Town Game Design

## Core loop

1. Start a twelve-minute run from the main menu.
2. Move around a simplified 130 x 130 arena-town map while zombies spawn in a safe pressure ring around the player.
3. Let automatic fixed-range baseball bat swings clear nearby zombies in emergencies.
4. Collect dropped XP gems from every defeated zombie.
5. Grab medkits as the basic healing system when damage starts to pile up.
6. Level up, choose one of three upgrade cards, and build around passives plus special abilities.
7. Earn coins during the run, then save them locally when the run ends.

## First version scope

- Static browser game with no build system or backend.
- Simplified 130 x 130 low-poly arena-town foundation using basic Three.js geometry, with clutter-heavy blockers removed for cleaner combat flow.
- One readable procedural survivor character with WASD movement, sprinting, touch joystick support, Xbox-style controller support, and a quick arcade jump.
- Survivor visual direction: red shirt or jacket, dark undershirt, blue pants, dark shoes, white/red/black cap, simple brown backpack, and wooden baseball bat. The survivor rises as a whole when jumping, tucks the legs slightly while airborne, and uses a small landing dip when returning to the ground.
- Multiple simple procedural zombie types that all chase the player directly.
- Automatic bat swing attack with a gold swing arc. The bat is a fixed close-range emergency weapon; damage and cooldown can improve, but range/area does not scale. Knockback Up is removed from the current level-up card pool.
- Special abilities are the primary ranged/offensive build system.
- XP gems, medkit health pickups, level-up upgrade cards, coins, pause, win screen, and loss screen.
- Player damage triggers a quick red screen-edge/border flash that fades smoothly so hits remain readable during busy zombie combat.

## Movement and jump

- Base player and zombie movement speeds are tuned about **10% faster** than the previous stable feel so the town pace is slightly snappier without changing the 12-minute run clock, spawn cadence, cooldowns, XP curve, medkit timers, or damage tick timers.
- **Spacebar** or an Xbox-style controller **A** button starts a quick, modest arcade jump only while grounded. Holding the jump input does not repeat jumps in midair.
- The player keeps camera-relative steering while airborne, so pressing a new WASD direction during a jump changes the movement direction instead of locking the original takeoff direction.
- Jumping is currently a movement-feel feature only: it does not grant invincibility, stomp damage, dodge frames, or special combat rules. Bat swings and special abilities can still operate while jumping.
- World objects now support simple reusable X/Z colliders. Placeholder buildings register solid rectangle footprints, trees and larger round props can register circle colliders, and vehicles/large debris can opt into the same obstacle system without a physics engine. Player movement resolves against these colliders with simple push-out/slide behavior while preserving camera-relative controls, sprinting, jumping, mobile controls, and controller controls. Zombie movement remains intentionally direct and simple: zombies still try to move toward the player without navmesh or smart pathfinding, but their positions are pushed out of registered solid world objects when practical. Residential no-roof houses split buildings into exterior wall colliders with doorway gaps instead of using one solid footprint, so door openings stay passable and safe-spawn checks avoid only the actual walls.

## Special ability system

Special abilities live in `src/abilities.js` and are designed as the active build-defining power set for each run. They are separate from passive run upgrades.

System rules:

- The long-term plan is **8 total special abilities**.
- A single run can unlock only **4 special abilities**.
- Each special ability has an `id`, display name, `maxLevel: 10`, and an `implemented` flag.
- Only abilities marked `implemented: true` can appear in the level-up card pool. All 8 planned special abilities are now implemented, and any future roadmap abilities must stay `implemented: false` until their behavior is built.
- Unlocking a special ability makes it **Level 1**.
- Each special ability upgrades from **Level 1 to Level 10**.
- Once a special ability reaches **Level 10**, it stops offering upgrade cards.
- If the player already has 4 chosen special abilities, level-up cards stop offering unlock cards for unchosen abilities.
- Already chosen special abilities can still offer upgrade cards until they reach Level 10.
- Ability upgrade cards raise that ability by one level, show the next level such as `Lv. 2/10`, and use the same zombie kill reward path as the bat so defeated zombies still drop XP.

### Implemented special abilities available now

All 8 planned abilities are implemented and can appear in the level-up card pool, while the player can still choose only 4 special abilities per run:

1. **Rusty Sawblade:** A bright low-poly spinning scrap disc that auto-launches on cooldown, targets roughly the nearest zombie, damages enemies it touches, and scales from Level 1-10 through modest damage, cooldown, hit-radius, speed/lifetime, and volley-count upgrades.
2. **Scrap Halo:** One or more visible low-poly scrap chunks orbit the player, spin automatically, and use contact/tick damage when orbiting chunks touch zombies. Scrap Halo scales from Level 1-10 through modest damage, orbital-count, orbital-speed, and hit-radius upgrades.
3. **Car Battery Zapper:** An automatic chain-zap special ability that fires on cooldown, hits the nearest zombie in range, then gains more damage, faster recharge, longer range, and extra chain targets as it upgrades from Level 1-10. Car Battery Zapper counts toward the 4 special ability limit and uses the normal zombie damage/death/reward path so kills still award XP and coins.
4. **Flame Bottle:** An automatic thrown area-damage special ability. It throws a small bottle toward the nearest zombie in range, or forward if no target is available, then creates a cartoon fire patch on the ground. Zombies in the patch take damage over time through the normal zombie damage/death/reward path. Flame Bottle counts toward the 4 special ability limit and upgrades from Level 1 to Level 10 through damage, duration, cooldown, radius, and extra-bottle improvements.
5. **Nailgun Barrage:** An automatic fast ranged projectile special ability. It fires small gray nail/bolt projectiles at nearby zombies, counts toward the 4 special ability limit, and upgrades from Level 1 to Level 10 through damage, fire-rate, extra-projectile, spread, and piercing improvements. Nailgun Barrage uses the normal zombie damage/death/reward path so projectile kills still award XP and coins.
6. **Pavement Slam:** An automatic circular crowd-control special ability that releases a short-lived shockwave around the player on cooldown. It damages nearby zombies, pushes them away from the player, counts toward the 4 special ability limit, and upgrades from Level 1 to Level 10 through damage, radius, recharge, knockback, and a final stronger panic-shockwave upgrade. Pavement Slam uses the normal zombie damage/death/reward path so kills still award XP and coins.
7. **Snap Trap:** An automatic ground-control special ability that drops low-poly scrap traps near the player or toward nearby zombies on cooldown. Traps sit on the ground for a limited lifetime, damage zombies that step into their trigger radius, and use the normal zombie damage/death/reward path so trap kills still award XP and coins. Snap Trap counts toward the 4 special ability limit and upgrades from Level 1 to Level 10 through damage, lifetime, recharge, active-trap count, trigger radius, and a final scrap-burst explosion when triggered.
8. **Scrap Turret:** An automatic deployable turret special ability that builds a small temporary scrap turret near the player on cooldown. The turret holds an area by facing and shooting nearby zombies with scrap bolts, counts toward the 4 special ability limit, and upgrades from Level 1 to Level 10 through damage, fire-rate, range, duration, active-turret count, and stronger scrap fire. Scrap Turret uses the normal zombie damage/death/reward path so turret kills still award XP and coins.

With all 8 planned special abilities implemented, the 4-ability cap remains the build constraint: players can unlock only four of the eight in one run while already chosen abilities and passive upgrades keep appearing normally.

## Passive run upgrades

Passive run upgrades now use CubeBasher-style values with Little Zombie Town names. They are repeatable up to simple safety caps, improve only the current run, and stack with permanent Upgrade Lab bonuses without mutating saved shop data or base config values. The current in-run passive upgrade pool has been simplified so level-up choices stay cleaner and leave more room for useful upgrades and special ability cards.

Current passive cards:

- **Scavenged Medkit:** +25 max HP and heal 25 immediately.
- **Worn-Out Sneakers:** +8% move speed.
- **Energy Drink:** +12% global player damage for the bat and player-created abilities where practical.
- **Canned Coffee:** -8% cooldowns, with cooldowns clamped so timers stay safe.
- **Scrap Magnet:** +35% pickup radius for XP pickup/magnet behavior.

Stamina, armor, crit, and regen passives were removed from the level-up pool for now to keep in-run choices cleaner while the sprint system remains simple and the map is still small. Special ability cards still exist separately from these passive cards, keep their own Level 1-10 progression, and still respect the 4-special-ability cap. Permanent upgrades and in-run passives stack additively or multiplicatively through run state: Heavy Hitter stacks with Energy Drink damage, Survivor’s Grit with Scavenged Medkit max HP, Quick Feet with Worn-Out Sneakers speed, and Scrap Magnetism with Scrap Magnet pickup radius.

## Permanent Upgrade Lab

The main menu includes a CubeBasher-style **Upgrade Lab** for permanent upgrades bought with saved coins between runs. Coins are earned during each run, added to the saved total when the run ends, and then spent from the same saved total without resetting existing player balances. Permanent upgrade levels save separately in browser `localStorage`, load safely when save data is missing or malformed, and affect future runs only once at run reset so repeated starts do not stack bonuses onto base config values.

Upgrade costs use the CubeBasher formula `Math.round(baseCost * Math.pow(1.75, currentLevel))`, where `currentLevel` is the level before purchase. Level 0 buying level 1 costs the base cost.


This naming/theme pass only changed player-facing names and description wording; upgrade ids, save ids, effects, values, cooldowns, levels, and ability behavior were left unchanged.

Permanent Upgrade Lab entries:

- **Heavy Hitter** (`dmg`, 💪): max 10, base cost 30, +5% damage per level. This applies to the bat and player-created abilities/projectiles/traps where practical, but not enemy damage.
- **Survivor’s Grit** (`hp`, ❤️): max 10, base cost 25, +10 max HP per level.
- **Quick Feet** (`speed`, 👟): max 8, base cost 35, +3% move speed per level.
- **Patch-Up** (`regen`, 🌿): max 8, base cost 40, +0.15 HP/sec regeneration per level, healing only up to max HP.
- **Iron Lungs** (`stamina`, ⚡): max 8, base cost 30, +12 max stamina per level. The value is saved and applied to run state so it is ready for stamina systems without changing current controls.
- **Looter’s Luck** (`gold`, 💰): max 8, base cost 45, +10% coins found per level. The multiplier is applied when enemies and rewards add run coins so the displayed run amount matches the saved total at run end.
- **Scrap Magnetism** (`magnet`, 🧲): max 8, base cost 30, +8% pickup radius per level.
- **Street Smarts** (`xp`, 📘): max 8, base cost 50, +6% XP gained per level. XP rewards are multiplied before being added to the visible XP bar and level progression.

Old permanent upgrade save ids are migrated when possible: `maxHealth` to `hp`, `moveSpeed` to `speed`, `pickupMagnet` to `magnet`, `coinBonus` to `gold`, and `batDamage` to `dmg`. New upgrades without old equivalents start at 0, and all loaded levels are clamped to their new max levels.

## Bat design rule

The bat is the close-range emergency weapon. Its range/radius should stay fixed, and level-up pools should not add Bat Range or Bigger Swing upgrades. Ranged power and larger area control should come from special abilities instead of the bat.

## Current prototype target

- Survive **12 minutes** on a **130 x 130** playable arena-town map centered around the origin, roughly spanning -65 to +65 on X/Z.
- The world now uses a simplified arena-town layout instead of the oversized handcrafted exploration-town experiment. The pivot keeps the zombie-town fantasy but prioritizes combat readability, kiting lanes, and reliable zombie flow.
- The arena is **130 x 130** with one clear central road crossing/intersection and four compact themed corners: Residential, Gas / convenience store, Park / open grass, and Parking lot / junk lot.
- Buildings in the active world are now solid, roofed, boarded-up obstacle structures. They are scenery and collision pieces only: no open-top houses, no enterable interiors, and no interior walls.
- Clutter-heavy blockers from the larger town pass were removed from the active world for gameplay reasons, including fences, chain-link fences, benches, picnic tables, playground items, hedges, bushes, dumpsters, road barricades, mailboxes, and other narrow props that could snag zombies.
- Active major blockers are intentionally limited to solid buildings, burnt vehicles, and larger park trees. Light rubble patches, road cracks/markings, sidewalks, parking lines, pumps, and small ground debris are decorative or minimally intrusive.
- The active arena now uses four reusable procedural burnt vehicle types: **Burnt Sedan**, **Burnt Van**, **Burnt Pickup Truck**, and **Burnt RV / Camper**. They are built from simple low-poly shapes with dark broken windows, rust patches, chunky bumpers/wheels, and type-specific silhouettes so cars, vans, pickups, and RVs read differently from the gameplay camera.
- Vehicles are solid obstacles with footprint colliders and are placed lightly around believable spots such as the parking/junk lot, road edges, the gas station area, and residential driveways. They should add abandoned-town flavor and route variety while preserving open combat space and avoiding maze-like clutter.
- Some reusable world prop helpers remain in `src/world.js` for now because they are self-contained prefab code and may still be useful later, but the simplified arena no longer places the clutter-heavy helpers in the active world.
- Use increased late-run spawn pressure plus light enemy health and damage scaling so the 12-minute test stays tense after the player levels up.
- Use simple browser-friendly geometry only: boxes, cylinders, spheres, cones, low-poly primitives, flat colors, and no imported models or textures.

## Healing and pickups

Medkits are the current basic healing system. They use simple low-poly red boxes with white crosses so they stay readable on the ground without external textures.

- A collected medkit heals a fixed amount while clamping the player to max health.
- Every defeated zombie still drops its XP gem and a loose coin pickup for its coin reward. Medkits are an extra rare drop and never replace XP or coin rewards.
- **Scrap Rush** is a rare glowing magnet/scrap pickup. Normal enemies have a tunable **0.8%** chance (`0.008`) to drop Scrap Rush, and Gravebreaker drops one on defeat. When collected, Scrap Rush shows a short "SCRAP RUSH!" message and marks every loose XP gem and coin on the map to rush toward the player like a magnet burst. Medkits are deliberately excluded so players can choose when to heal.
- Drop chances live near zombie type tuning: Walkers are rare, Runners/Little Zombies and Spitters are slightly more likely, and Brutes/Crushers/Mini Bosses are more rewarding without replacing XP drops.
- World medkits begin appearing around **0:45**, then occasionally respawn near—but not directly on—the player, with small world and total active caps so healing remains helpful without flooding the arena. Medkits and practical pickup drops use the shared safe-spawn helper so they stay inside the 130 x 130 play area and avoid registered solid world objects such as buildings, vehicles, and large trees.

## Zombie progression

Zombie tuning lives in `src/config.js` so health, speed, damage, XP, coins, size, spawn weight, unlock time, and unlock level are easy to adjust.

- **0:00 to 1:30 / levels 1-2:** Walker Zombies are the default threat.
- **1:30+ or level 3+:** Little Runner Zombies join as smaller, faster, lower-health chasers.
- **3:00+ or level 5+:** Brute Zombies join as larger, slower, high-health chasers with stronger contact damage.
- **5:00+ or level 6+:** Spitter Zombies join as toxic-colored visual variants; for now they still chase directly instead of firing projectiles.
- **6:00+ or level 9+:** Crusher Zombies enter as late-game heavy chasers between Brutes and Gravebreaker.
- **4:00 and 8:00 boss events:** Gravebreaker awakens as a timed boss event. Only one Gravebreaker can exist at a time, so the 8:00 event is skipped if the 4:00 Gravebreaker is still alive.

Normal zombies spawn near the player in a tunable donut/ring rather than across the far side of the larger town map, keeping combat pressure tight without increasing the spawn rate or horde cap. Spawn candidates are checked against the 130 x 130 map bounds and registered solid world objects when possible, so mobs avoid buildings, vehicles, and large trees before falling back to the safest available nearby point. Zombies still use simple direct chasing after spawning; this does not add navmesh or smart pathfinding.

Spawn pressure increases over the run: spawn delays shrink gradually, the active horde cap rises, and later zombie type weights become more prominent after they unlock, with extra late pressure on heavy enemies after minute five. Enemy health scales slowly by elapsed minutes and contact damage scales even more lightly, keeping the opening approachable while preventing the late run from becoming too easy. XP rewards also gain a modest time-based multiplier after minute five, and level XP growth softens after level 10, so upgrades keep feeding through the full 12-minute run. Strong successful play should trend closer to level 24-30 instead of stalling near the high teens.

## Zombie type roles

- **Walker Zombie:** Medium green skin, dull blue shirt, normal size, baseline health, speed, contact damage, XP, and coins.
- **Little/Runner Zombie:** Smaller body, purple accent, faster speed, lower health, and slightly higher XP than a walker.
- **Brute Zombie:** Larger chunky body, brown/dark torso, slow speed, high health, higher contact damage, and stronger XP/coin rewards.
- **Spitter Zombie:** Medium body with toxic green accent and a larger throat/head silhouette; currently behaves as a normal chaser with higher XP.
- **Crusher Zombie:** Bigger than a Brute but smaller than Gravebreaker, with a rusty heavy torso, wide shoulders, more health and damage than a Brute, and a 4x-5x walker XP reward.
- **Gravebreaker:** Very large timed boss with a dark torso, bigger arms, simple crown/spike cones, high health, slow but pressuring movement tuned slightly faster than the original boss pass, a top-center boss health bar that sits below the normal HUD, and a large XP/coin reward. A large warning message appears when he spawns. Gravebreaker can slam about every 4 seconds when the player is close enough, keeps his red slam warning circle during a roughly 3-second wind-up, then deals heavy impact damage only at the impact moment if the player remains inside the visible circle. The slam warning circle is treated as the actual world-space damage zone so the visible danger radius matches the hit check.

## Future ideas

- Give Spitter Zombies an isolated, easy-to-read projectile attack once the foundation is stable.
- More readable low-poly landmarks only if they preserve the simplified arena flow; avoid returning to clutter-heavy barricades or narrow blocker props.
- Persistent cosmetic unlocks bought with coins.
- More arenas, weather effects, and ambient sound.
- Controller and touch controls.

## Controls

## Controller support

- Browser Gamepad API support targets standard Xbox-style controllers first, including Xbox 360-style desktop testing where the browser exposes a compatible mapping.
- **Left stick** moves the survivor using the same camera-relative movement system as keyboard WASD and the mobile joystick, with a deadzone to prevent drift and normalized diagonal movement.
- **Right stick** rotates camera yaw and adjusts pitch using the same clamp limits as mouse/touch camera controls.
- **A / button 0** jumps during gameplay, selects highlighted menu buttons, and selects the highlighted level-up card when cards are open.
- **B / button 1** cancels or backs out where safe, including resuming from the simple pause menu.
- **Start/Menu / button 9** pauses and resumes the current run when mapped by the browser/controller.
- **LB/RB / buttons 4 and 5** smoothly zoom the camera out/in through the same clamped camera distance used by mouse wheel and mobile pinch zoom. LT/RT may also mirror zoom on controllers/browsers that expose them consistently.
- **D-pad or left stick** moves through start, pause, game-over/victory, and level-up card selections with a short repeat delay so held input does not skip too quickly. Level-up cards default to the middle card when three choices appear.
- Controller mappings can vary slightly by browser and hardware; Xbox-style controllers are the main target, and if no gamepad is connected, keyboard, mouse, and touch input continue unchanged.

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

- Win by surviving until the timer reaches **12:00**.
- Lose if health reaches **0** before the timer finishes.
