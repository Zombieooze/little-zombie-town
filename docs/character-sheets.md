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

A medium green, cute-spooky blocky zombie wearing a dull blue ragged shirt/tunic. The Walker Zombie has been remodeled to match the reference sheet: a square head, simple white eyes with dark pupils, a small blocky nose, an open square mouth with chunky teeth, small horn-like head spikes, chunky green arms, dark pants, and dark boots. Walkers are normal-sized, slow-to-medium chasers with baseline health, contact damage, XP, and coin rewards. Their job is to crowd the player from the start without becoming frightening or realistic. The Walker Zombie now has a simple shamble/walk animation foundation: subtle opposing arm-and-leg swings, a tiny body bob, and a light side-to-side sway while moving.

## Little / Runner Zombie

A smaller, faster zombie with green skin and a purple ragged shirt/tunic. The Runner Zombie has been remodeled to match the reference sheet: a leaner square-headed zombie with white eyes and dark pupils, aggressive eyebrows, an open mouth with chunky teeth, upward head spikes, forward-reaching blocky arms, dark pants, and dark boots. Runners have lower health than walkers, but they close distance quickly and drop slightly more XP. They appear after the early warm-up, around level 3 or 1:30 into the run. The Runner Zombie also has a cleanup pass with arms seated closer to the shoulders and a fast running animation: quicker opposing arm/leg swings plus a light rapid bob and sway, keeping it visibly more frantic and aggressive than the Walker Zombie shamble.

## Brute Zombie

A large, chunky zombie with green skin, a square blocky head, angry white eyes with dark pupils, an open mouth with chunky teeth, thick arms, heavy fists, a bulky dark brown/rusty ragged vest, dark pants, and dark boots. The Brute Zombie has been remodeled to match the reference sheet with a wider torso, square metal vest patches, and a heavier silhouette so it reads as tougher and slower than the Walker and Runner. Brutes move slower than walkers, have much more health, deal stronger contact damage, and drop a larger XP and coin reward. The Brute Zombie now has corrected shoulder/upper-torso arm attachment for its two-part arms, keeping the upper arms, lower arms, and heavy fists connected from gameplay angles. Brutes also use a slow heavy lumbering walk animation with longer strides, weighted arm swings, a controlled stomp bob, and a subtle side-to-side weight shift so they read as heavy without changing gameplay balance. They begin appearing around level 5 or 3:00 into the run.

## Spitter Zombie

A medium toxic zombie with green skin, a square blocky head, angry white eyes with dark pupils, a large open mouth with chunky teeth, a single purple head spike, a ragged purple shirt/tunic, dark pants, dark boots, toxic green slime patches, and a swollen throat/chest/belly area that suggests it stores slime. The Spitter Zombie has been remodeled to match the reference sheet while keeping the same low-poly procedural shape language as the other zombies. Its mouth and throat area are intentionally clear and readable so a future slime projectile origin can attach near the mouth. The Spitter now has its own medium-paced toxic shamble animation with modest leg swings, slight arm motion, a light bob, and a small side-to-side sway so it feels distinct from both the frantic Runner and the heavy Brute.

Spitters use keep-away ranged behavior instead of acting like pure melee chasers: they advance when the player is too far away, hold their preferred range when they can attack, and slowly back away if the player gets too close. Their spit wind-up animation is now tied to the attack: the body braces and leans forward, the arms open outward, and at the peak of that motion a bright toxic-green cartoon slime blob fires from the mouth/throat area toward the player's position at that instant. The slime projectile travels in a straight, dodgeable line, damages only the player, and expires after impact or after traveling its tuned range. They begin appearing around level 6 or 4:00 into the run.

## Crusher Zombie

A late-game heavy zombie that bridges the gap between Brutes and the Mini Boss. The Crusher Zombie has been remodeled to match the reference sheet: green skin, a large square angry head, intense red eyes, an open mouth with chunky teeth, a dark gray armored torso, rusty shoulder plates, simple spikes and metal studs, oversized arms, heavy wrist bands, large fists, dark pants, and dark boots. It is bigger and more armored than the Brute but still smaller than the Boss, with a wide late-game silhouette built only from simple procedural low-poly primitives. Its top head spikes now sit directly on the armored head surface instead of floating, preserving the remodel while making the silhouette read as attached metal spikes. It now has its own slow heavy stomp/walk animation: long powerful steps, larger weighted arm swings, a controlled body dip, and a subtle shoulder/torso weight shift that makes it feel heavier than the Brute without changing gameplay balance. It remains a simple chaser for now: no projectiles, no area attacks, and no special attack behavior.

## Boss / Gravebreaker

The Boss Zombie has been remodeled as **Gravebreaker**, a giant named monster boss built from the same lightweight procedural low-poly shapes as the other enemies. Gravebreaker has green skin, a huge square head, angry red eyes, an open mouth with chunky teeth, a massive dark armored torso with a skull plate, oversized arms, huge fists, shoulder armor with spikes/studs, dark pants, and dark boots. It is intended to read as the largest zombie in the game and visually distinct from the Crusher rather than a simple scaled-up heavy enemy. Gravebreaker now has a heavy boss walk animation with slower, larger steps than Crusher, huge weighted arm swings, controlled body bob, and subtle torso/shoulder weight shifts so he reads as a giant monster rather than a normal chaser. He also has a visual-only ground-slam wind-up animation for testing: his arms raise, he holds the loaded pose, then smashes down near the end while a procedural warning ring previews the future danger radius. This slam pass does not damage the player and does not change contact damage. Gravebreaker keeps the existing Boss Zombie gameplay role, spawn behavior, health, speed, damage, XP, and coin rewards unchanged. Future boss mechanics are planned separately for the next pass: real slam damage/attack logic, timed 4:00/8:00 spawns, a top boss health bar, and a warning message.

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
8. **Junkyard Turret:** Small low-poly scrap turret with a squat tripod/base, boxy scrap-metal body, little short barrel, gray/yellow scrap bolts or pellets, and tiny arcade muzzle flashes. Keep it toy-like, readable, and lightweight.

Future ability effects should reinforce that ranged power comes from special abilities while the bat remains a fixed-range emergency weapon.
