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

The player should stay simple and game-ready. Build the character from basic Three.js primitives only, with no external models, textures, sprite sheets, GLTF files, or Blender assets. The arms should swing from shoulder pivots, and the legs should swing from hip pivots so the walking animation reads cleanly.

## Player attack identity

The main attack identity is a baseball bat swing. The current game can keep using the automatic area-damage mechanic under the hood, but the presentation should read as a bat attack:

- The bat moves during each attack.
- A short yellow/gold swing arc appears around the survivor.
- Small square spark particles can pop from hit zombies.
- Upgrades can improve swing cooldown, damage, and knockback, but the bat keeps a mostly fixed attack range so the swing stays readable.

## Walker Zombie

A greenish, cute-spooky blocky zombie wearing a purple shirt. Walkers are slow, persistent, and non-graphic. Their job is to crowd the player and create arcade pressure without becoming frightening or realistic.

## Future zombie ideas

- **Runner**: Smaller and faster, but low health.
- **Brute**: Big, slow, and chunky with more health.
- **Spitter**: Keeps distance and lobs harmless-looking slime blobs.
- **Boss**: A giant parade-float-style zombie with silly animations and multiple phases.

## Town prop style

Future zombies and town props should follow the same simple low-poly geometry style as the survivor.

- **Ruined buildings**: Simple block shapes with missing chunks, dark windows, and crooked silhouettes.
- **Cars**: Abandoned toy-like cars made from stacked boxes.
- **Barricades**: Chunky wood or concrete blocks placed near roads and corners.
- **Rubble**: Small clusters of cubes and stones.
- **Dead trees**: Thin angular trunks and branches with no leaves.

## Visual tone

Cartoon post-apocalyptic and non-graphic. The mood is dark green and purple night-time, but objects should remain bright, readable, and toy-like.

## Health pickups

Small red-and-white medkits can appear as rare zombie drops or occasional world pickups. Collecting one restores a modest amount of health without exceeding max health, with a quick `+HP` floating feedback label.

## Movement feel

The survivor faces the current movement/attack direction, keeps the existing walking bob, and can use Space for a short hop. Mouse drag can orbit the camera, and the wheel zooms in or out within safe limits while keeping the default camera feel.
