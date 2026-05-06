# Utilities

## Purpose

The framework exposes common helper functions globally. They are useful for object cloning, merging, random selection, string conversion, number normalization, and image checks.

```javascript
const data = clone(source);
const value = number(input, 0, 0, 100);
const key = convert('My Text', 'snake');
```

## Function List

| Function | Purpose |
| :--- | :--- |
| `clone()` | Clone values |
| `equal()` | Deep equality check |
| `merge()` | Merge objects |
| `contains()` | Array containment check |
| `random()` | Random number |
| `either()` | Pick one random item |
| `SelectCase` | Chainable condition matcher |
| `convert()` | String case conversion |
| `number()` | Normalize number input |
| `loadImage()` | Check/load image |

## Examples

```javascript
const next = clone({ a: 1, b: { c: 2 } });
```

```javascript
merge(target, source, {
  mode: 'concat'
});
```

```javascript
contains([1, 2, 3], [2, 4], 'any');
```

```javascript
random(5, 10);
either(['a', 'b', 'c']);
```

```javascript
convert('Hello World', 'snake'); // hello_world
number(120, 0, 0, 100); // 100
```

## Related

For seed-based reproducible random values, use `maplebirch.tool.rand.create()`.
