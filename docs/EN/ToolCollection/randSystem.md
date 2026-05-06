# Random System

`randSystem` creates reproducible random number generators. Use it when a mod needs a seed, repeatable results, replayable random events, or easier debugging.

For one-off randomness, vanilla/global helpers such as `random()` or `either()` may be enough. Use `maplebirch.tool.rand.create()` when the same seed should produce the same sequence.

## Create A Generator

```javascript
const rng = maplebirch.tool.rand.create();
```

With initial state:

```javascript
const rng = maplebirch.tool.rand.create({
  seed: 12345
});
```

## Minimal Example

```javascript
const rng = maplebirch.tool.rand.create();

rng.Seed = 12345;

const percent = rng.rng; // 1-100
const index = rng.get(5); // 0-5
```

## API

| API | Description |
| :--- | :--- |
| `maplebirch.tool.rand.create(state?)` | Create a generator |
| `rng.Seed` | Get or set the seed |
| `rng.rng` | Generate an integer from `1` to `100` |
| `rng.get(max)` | Generate an integer from `0` to `max` |
| `rng.backtrack(count)` | Move the random pointer backward |
| `rng.history` | Generated result history |
| `rng.pointer` | Current history pointer |

## Reproducible Rolls

```javascript
function roll(seed) {
  const rng = maplebirch.tool.rand.create();
  rng.Seed = seed;
  return [rng.rng, rng.rng, rng.rng];
}

roll(100);
roll(100); // same result sequence
```

## Percentage Check

```javascript
const rng = maplebirch.tool.rand.create();
rng.Seed = V.myMod.seed;

if (rng.rng <= 30) {
  setup.myMod.triggerRareEvent();
}
```

## Array Pick

```javascript
const list = ['weakEnemy', 'normalEnemy', 'treasure'];
const result = list[rng.get(list.length - 1)];
```

## Backtracking

```javascript
const first = rng.rng;
const second = rng.rng;

rng.backtrack(1);

const again = rng.rng; // same as second
```

## Save Data

Store the seed when the sequence should belong to the save:

```javascript
V.myMod ??= {};
V.myMod.seed ??= Date.now();

const rng = maplebirch.tool.rand.create();
rng.Seed = V.myMod.seed;
```

If exact continuation matters, also store `history` and `pointer`, then pass the saved state back to `create(state)`.
