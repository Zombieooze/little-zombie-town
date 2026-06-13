# Little Zombie Town Game Design

## Core loop

1. Start a three-minute run from the main menu.
2. Move around a small ruined town arena while walker zombies spawn at the edges.
3. Let automatic defense pulses clear nearby zombies.
4. Collect dropped XP gems.
5. Level up, choose one of three upgrade cards, and keep surviving.
6. Earn coins during the run, then save them locally when the run ends.

## First version scope

- Static browser game with no build system or backend.
- Procedural low-poly town using basic Three.js geometry.
- One player character with WASD movement and sprinting.
- One enemy type: Walker Zombie.
- Automatic circular pulse attack.
- XP gems, level-up upgrade cards, coins, pause, win screen, and loss screen.

## Future ideas

- More zombie types and themed waves.
- New weapons such as bottle rockets, spooky lanterns, and toy turrets.
- Persistent cosmetic unlocks bought with coins.
- More arenas, weather effects, and ambient sound.
- Controller and touch controls.

## Controls

- **WASD**: Move.
- **Shift**: Sprint.
- **P**: Pause or unpause.
- **M**: Toggle mute placeholder.

## Win/loss condition

- Win by surviving until the timer reaches **3:00**.
- Lose if health reaches **0** before the timer finishes.
