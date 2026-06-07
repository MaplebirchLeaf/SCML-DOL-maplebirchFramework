# Random System

`randSystem` creates reproducible random number generators. Use it when a mod needs saved seeds, repeatable results, replayable random events, backtracking, or easier debugging.

For one-off randomness, global helpers such as `random()` or `either()` may be enough. Use **`maplebirch.tool.rand.create()`** when the same state should produce the same sequence.

## Create A Generator

```javascript
const rng = maplebirch.tool.rand.create();
```

With save-backed state:

```javascript
V.myMod ??= {};
V.myMod.rand ??= {};

const rng = maplebirch.tool.rand.create(V.myMod.rand);
```

`create(state)` uses the passed object as its internal state, so storing that object in `V` lets the sequence follow the save.

## Minimal Example

```javascript
const rng = maplebirch.tool.rand.create();

rng.seed = 12345;

const percent = rng.percent(); // 1-100
const index = rng.int(5); // 0-5
```

## API

| API | Description |
| :--- | :--- |
| `maplebirch.tool.rand.create(state?)` | Create a generator |
| `rng.seed` | Get or reset the seed |
| `rng.int(max)` | Generate an integer from `0` to `max` |
| `rng.percent()` | Generate an integer from `1` to `100` |
| `rng.back(steps?)` | Move the random history pointer backward |
| `rng.forward(steps?)` | Move the pointer forward through existing history |
| `rng.history` | Copy of generated result history |
| `rng.index` | Current history pointer |

## Reproducible Rolls

```javascript
function roll(seed) {
  const rng = maplebirch.tool.rand.create();
  rng.seed = seed;
  return [rng.percent(), rng.percent(), rng.percent()];
}

roll(100);
roll(100); // same result sequence
```

## Percentage Check

```javascript
V.myMod ??= {};
V.myMod.rand ??= {};

const rng = maplebirch.tool.rand.create(V.myMod.rand);

if (rng.percent() <= 30) {
  setup.myMod.triggerRareEvent();
}
```

## Array Pick

```javascript
const list = ['weakEnemy', 'normalEnemy', 'treasure'];
const result = list[rng.int(list.length - 1)];
```

## Back And Forward

```javascript
const first = rng.percent();
const second = rng.percent();

rng.back(1);

const again = rng.percent(); // same as second
```

`forward(steps)` only moves through already generated history. It does not create new random values.

```javascript
rng.back(2);
rng.forward(1);
```

## Save Data

Store the full state object when the sequence should belong to the save:

```javascript
V.myMod ??= {};
V.myMod.rand ??= {};

const rng = maplebirch.tool.rand.create(V.myMod.rand);
```

The state contains `seed`, `history`, and `index`. Saving only `seed` reproduces a sequence from the beginning; saving the full state restores the exact walked history.
