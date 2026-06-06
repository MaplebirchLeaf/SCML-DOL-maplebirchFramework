# Utilities

Utilities are small shared APIs for common mod-script work: cloning values, merging configuration objects, appending arrays, checking containment, picking random values, converting string case, clamping numbers, and checking image resources.

The framework installs these helpers during initialization. Mods can use the global functions such as `clone()`, `merge()`, and `loadImage()`, but the preferred style is the prototype/static form:

- Use prototype methods when operating on an existing value, such as `source.clone()`, `target.merge(source)`, or `'name'.convert('title')`.
- Use static methods when creating a new object or array, such as `Object.merge(defaults, current)` or `Array.append(base, extra)`.
- Number helpers live on `Math`, such as `Math.clamp(value, min, max)`.

Be aware that `target.merge()`, `target.append()`, and `target.cover()` mutate the receiver. If you do not want to modify the original value, use static constructors like `Object.merge()` or `Array.append()`.

```javascript
const data = source.clone();
const next = Object.merge(defaults, current ?? {});
const value = Math.clamp(input, 0, 100);
const key = 'My Text'.convert('snake');
```

## Common Methods

| Method | Purpose |
| :--- | :--- |
| `value.clone(deep, proto)` | Clone a value |
| `value.equal(other)` | Deep equality check |
| `target.merge(source)` | Recursive merge; arrays merge by index |
| `target.append(source)` | Recursive merge; arrays append |
| `target.cover(source)` | Recursive merge; arrays replace |
| `target.mergefn(fn, source)` | Filtered `merge` |
| `target.appendfn(fn, source)` | Filtered `append` |
| `target.coverfn(fn, source)` | Filtered `cover` |
| `value.contains(item, mode, options)` | Containment check |
| `array.random()` | Pick a random item |
| `array.either(weights, allowNull)` | Pick a candidate, optionally weighted |
| `string.convert(mode, options)` | Convert string case |
| `Math.random(max)` / `Math.random(min, max, float)` | Random number |
| `Math.clamp(value, min, max, fallback)` | Clamp a value into a range |
| `loadImage(src)` | Check or load an image |

## clone

```javascript
const next = source.clone();
const shallow = source.clone(false);
const plain = source.clone(true, false);
```

Arguments:

| Argument | Default | Description |
| :--- | :--- | :--- |
| `deep` | `true` | Deep clone |
| `proto` | `true` | Preserve prototypes |

Supports plain objects, arrays, `Date`, `RegExp`, `Map`, `Set`, `ArrayBuffer`, `DataView`, and TypedArray values.

## merge / append / cover

These methods mutate the receiver.

```javascript
target.merge(source);
target.append(source);
target.cover(source);
```

The main difference is array handling:

```javascript
({ list: [1, 2] }).merge({ list: [3] });  // { list: [3, 2] }
({ list: [1, 2] }).append({ list: [3] }); // { list: [1, 2, 3] }
({ list: [1, 2] }).cover({ list: [3] });  // { list: [3] }
```

Use static constructors when you want a new object:

```javascript
const next = Object.merge(defaults, current);
const list = Array.append(baseList, extraList);
```

Filtered variants are useful for partial merges:

```javascript
target.mergefn((key, value, depth, targetValue) => targetValue === undefined, source);
```

## contains

```javascript
[1, 2, 3].contains(2); // true
[1, 2, 3].contains([1, 2], 'all'); // true
[1, 2, 3].contains([2, 4], 'any'); // true
[1, 2, 3].contains([4, 5], 'none'); // true
'Hello World'.contains('hello', { case: false }); // true
```

Objects, `Set`, and `Map` can also call `contains`; their values are checked.

## random / either

```javascript
Math.random(); // Native 0-1 float
Math.random(10); // 0-10 integer
Math.random(5, 10); // 5-10 integer
Math.random(5, 10, true); // 5-10 float

['a', 'b', 'c'].random();
['rare', 'normal'].either([0.1, 0.9]);
['a', 'b'].either(undefined, true); // May return null
```

For seed-based reproducible random values, use [randSystem](ToolCollection/randSystem.md).

## convert

```javascript
'Hello World'.convert('snake'); // hello_world
'Hello World'.convert('kebab'); // hello-world
'hello world'.convert('pascal'); // HelloWorld
```

Supported modes:

| Mode | Example |
| :--- | :--- |
| `lower` | `hello world` |
| `upper` | `HELLO WORLD` |
| `capitalize` | `Hello world` |
| `title` | `Hello World` |
| `camel` | `helloWorld` |
| `pascal` | `HelloWorld` |
| `snake` | `hello_world` |
| `kebab` | `hello-world` |
| `constant` | `HELLO_WORLD` |

## Math.clamp

```javascript
Math.clamp('12.5', 0, 100); // 12.5
Math.clamp(120, 0, 100); // 100
Math.clamp(undefined, 0, 100, 10); // 10
```

`fallback` is used only when the input cannot be converted into a finite number. If omitted, the lower bound is used.

## loadImage

```javascript
const result = await loadImage('img/myMod/icon.png');

if (result) {
  console.log('Image is available');
}
```

`loadImage()` may return a boolean, an image path, or a Promise. Use `await` in async flows.
