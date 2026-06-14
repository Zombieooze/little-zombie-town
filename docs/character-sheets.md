# Little Zombie Town Character and World References

## Player

A brave low-poly arcade survivor with blocky proportions and high-contrast colors for readability from the angled top-down camera.

Current procedural model direction:

- Blocky head with simple eyes.
- Red shirt or jacket over a dark/black undershirt.
- Blue pants and dark shoes.
- White/red/black cap with a red brim.
- Simple brown backpack with a flap and buckle.
- Wooden baseball bat held in hand.

The player should stay simple and game-ready. Build the character from basic Three.js primitives only, with no external models, textures, sprite sheets, GLTF files, or Blender assets.

## Player attack identity

The main attack identity is a baseball bat swing. The current game can keep using the automatic area-damage mechanic under the hood, but the presentation should read as a bat attack:

- The bat moves during each attack.
- A short yellow/gold swing arc appears around the survivor.
- Small square spark particles can pop from hit zombies.
- Upgrades can improve swing cooldown, damage, and knockback, but the bat stays fixed-range.

## Walker Zombie

A medium green, cute-spooky blocky zombie wearing a dull blue shirt. Walkers are normal-sized, slow-to-medium chasers with baseline health, contact damage, XP, and coin rewards. Their job is to crowd the player from the start without becoming frightening or realistic.

## Little / Runner Zombie

A smaller, faster zombie with green skin and a purple shirt or purple accent. Runners have lower health than walkers, but they close distance quickly and drop slightly more XP. They appear after the early warm-up, around level 3 or 1:30 into the run.

## Brute Zombie

A large, chunky zombie with a brown or dark torso and heavier arms. Brutes move slower than walkers, have much more health, deal stronger contact damage, and drop a larger XP and coin reward. They begin appearing around level 5 or 3:00 into the run.

## Spitter Zombie

A medium zombie with toxic green accents and a slightly different silhouette, such as a bigger head or rounded throat/belly shape. In the current foundation pass, Spitters do not shoot projectiles; they chase like other zombies while staying visually distinct and rewarding more XP. They begin appearing around level 6 or 4:00 into the run.

## Crusher Zombie

A late-game heavy zombie that bridges the gap between Brutes and the Mini Boss. The Crusher is bigger than a Brute but smaller than a Boss, with a rusty brown or dark gray torso, wide blocky shoulders, chunky arms, and a heavy silhouette built only from simple procedural low-poly primitives. It is a simple chaser for now: no projectiles, no area attacks, and no special attack behavior.

## Boss / Mini Boss Zombie

A much larger zombie with a dark torso, oversized arms, and simple cone spikes or a crown-like silhouette. The Mini Boss has high health, slow movement, stronger contact damage, and a much higher XP and coin reward. It should appear rarely, generally once around 7:00 to 8:00 during the 10-minute test run or after the player reaches a high enough level.

## Town prop style

Future zombies and town props should follow the same simple low-poly geometry style as the survivor.

- **Ruined buildings**: Simple block shapes with missing chunks, dark windows, and crooked silhouettes.
- **Cars**: Abandoned toy-like cars made from stacked boxes.
- **Barricades**: Chunky wood or concrete blocks placed near roads and corners.
- **Rubble**: Small clusters of cubes and stones.
- **Dead trees**: Thin angular trunks and branches with no leaves.

## Visual tone

Cartoon post-apocalyptic and non-graphic. The mood is dark green and purple night-time, but objects should remain bright, readable, and toy-like.

## Special ability visual notes

All special abilities should stay low-poly, toy-like, readable from the default camera, and built from procedural Three.js primitives. No external textures, sprite sheets, GLTF files, or realistic gore.

1. **Spinning Sawblade:** Bright low-poly scrap disc with a flat metal body, chunky teeth, fast spin, and no gore.
2. **Scrap Orbitals:** Toy-like junk parts circling the survivor, using small colorful boxes/cones with readable motion from the default camera distance.
3. **Electric Zapper:** Quick blue/yellow electric line from the player to a zombie, then short chain lines between zombies at higher levels. Add tiny blue/yellow spark cubes at hit points for a low-poly arcade effect.
4. **Fire Bottle:** Small thrown bottle arcing outward, then a cartoon low-poly fire patch on the ground with orange/yellow arcade flames. Keep it readable and playful with no gore or realistic burning.
5. **Nail Blaster:** Small gray nail/bolt projectiles fired in fast projectile bursts. Keep the bolts thin, low-poly, arcade-readable, and lightweight enough for many simultaneous shots; optional tiny spark hits can be added without gore or external assets.
6. **Shockwave Stomp:** Expanding low-poly ring around the survivor, colored pale blue, white, yellow, or dusty orange, with a tiny dust/spark burst. It should read as an arcade panic/crowd-control ability that pushes space open around the player without gore or external assets.
7. **Bear Trap Toss:** Low-poly metal trap built as a flat ground object with a dark base, simple jaws/arms, and small teeth/spikes. Triggering it should read as a quick arcade snap with a small spark/scrap burst effect, staying playful and non-gory.
8. **Junkyard Turret:** Small squat scrap tripod or box turret with a short barrel, using mismatched metal colors and simple muzzle flashes.

Future ability effects should reinforce that ranged power comes from special abilities while the bat remains a fixed-range emergency weapon.
