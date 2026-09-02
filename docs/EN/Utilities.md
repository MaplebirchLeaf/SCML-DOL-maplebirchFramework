# Utilities

Utilities are shared APIs for mod scripts. They reduce repeated code around:

- Cloning, comparing, and merging objects or arrays.
- Checking containment in arrays, objects, `Set`, `Map`, and strings.
- Picking random array items, including weighted choices.
- Converting string case.
- Clamping numbers.
- Checking image resources.
- Handling text, JSON, bytes, Base64, and paths.

The framework installs prototype/static helpers during initialization, and also exposes common helpers globally.

## Preferred Style

Use `maplebirch.utils` functions when operating on an existing value; array and string instance methods (`contains`/`convert`, etc.) are still available:

```javascript
const copy = maplebirch.utils.clone(source);
const same = maplebirch.utils.equal(oldData, newData);
const ok = tags.contains('beast');
const key = 'My Text'.convert('snake');
```


Use static methods when creating a new object or array:

```javascript
const options = Object.merge(defaultOptions, userOptions);
const list = Array.append(baseList, modList);
```

Number helpers live on `Math`:

```javascript
const value = Math.clamp(input, 0, 100);
```

## Prototype vs Static Methods

The framework no longer registers instance methods such as `clone`/`equal`/`merge`/`append`/`cover` on `Object.prototype`; plain object instances no longer have them (`obj.cover === undefined`). Object merging now uses `maplebirch.utils` functions, whose first argument is the target object (modified and returned):

```javascript
maplebirch.utils.merge(target, source);
maplebirch.utils.append(target, source);
maplebirch.utils.cover(target, source);
```

The array instance methods `contains`/`random`/`either` and the string instance methods `contains`/`convert` are still available.

Static methods create a new object or array:

```javascript
const next = Object.merge(defaults, current);
const list = Array.append(base, extra);
```

Prefer `Object.merge()`, `Object.append()`, `Object.cover()`, `Array.merge()`, `Array.append()`, and `Array.cover()` when you do not want to mutate existing data.

## Common Methods

| Method                                        | Description                              |
| :-------------------------------------------- | :--------------------------------------- |
| `maplebirch.utils.clone(source, deep, proto)` | Clone a value                          |
| `maplebirch.utils.equal(a, b)`              | Deep equality check                      |
| `maplebirch.utils.merge(target, ...sources)` | Recursive merge; arrays merge by index |
| `maplebirch.utils.append(target, ...sources)` | Recursive merge; arrays append        |
| `maplebirch.utils.cover(target, ...sources)` | Recursive merge; arrays replace        |
| `maplebirch.utils.mergefn(target, fn, ...sources)` | Filtered `merge`                |
| `maplebirch.utils.appendfn(target, fn, ...sources)` | Filtered `append`              |
| `maplebirch.utils.coverfn(target, fn, ...sources)` | Filtered `cover`                |
| `Object.merge(...sources)`                   | Create a new object and merge (static)   |
| `Object.append(...sources)`                  | Create a new object and append (static)  |
| `Object.cover(...sources)`                   | Create a new object and cover (static)   |
| `Array.merge(...sources)`                    | Create a new array and merge (static)    |
| `Array.append(...sources)`                   | Create a new array and append (static)   |
| `Array.cover(...sources)`                    | Create a new array and cover (static)    |
| `array.contains(value, mode, opt)`           | Containment check (array instance)       |
| `array.random()`                             | Pick a random array item (array instance) |
| `array.either(weights, allowNull)`           | Pick a random item, optionally weighted (array instance) |
| `string.convert(mode, opt)`                  | Convert string case (string instance)    |
| `Math.random(max)`                           | Integer from `0` to `max`            |
| `Math.random(min, max, float)`               | Random number between `min` and `max` |
| `Math.clamp(value, min, max, fallback)`      | Clamp a number                           |
| `loadImage(src)`                             | Check or load an image resource          |

In the table, `Object.*`/`Array.*` are static methods and `array.*`/`string.*` are array/string instance methods; all remain available. `maplebirch.utils.*` are functional calls. To check whether a plain object contains a value, collect `Object.values(obj)` first and then use the array `contains`.

## clone

```javascript
const deepCopy = maplebirch.utils.clone(source);
const shallowCopy = maplebirch.utils.clone(source, false);
const plainCopy = maplebirch.utils.clone(source, true, false);
```

Arguments:

| Argument | Default | Description         |
| :------- | :------ | :------------------ |
| `deep`   | `true`  | Deep clone          |
| `proto`  | `true`  | Preserve prototypes |

Supports plain objects, arrays, `Date`, `RegExp`, `Map`, `Set`, `ArrayBuffer`, `DataView`, and TypedArray values.

`clone()` handles circular references. Non-enumerable properties are not copied.

## equal

```javascript
const same = maplebirch.utils.equal(dataA, dataB);
```

`equal()` performs deep comparison, which is useful for objects, arrays, and nested structures.

## merge / append / cover

These functions recursively merge objects. Their main difference is array handling.

```javascript
maplebirch.utils.merge({ list: [1, 2] }, { list: [3] }); // { list: [3, 2] }
maplebirch.utils.append({ list: [1, 2] }, { list: [3] }); // { list: [1, 2, 3] }
maplebirch.utils.cover({ list: [1, 2] }, { list: [3] }); // { list: [3] }
```

Objects are merged recursively:

```javascript
const result = Object.merge({ npc: { enabled: true, count: 2 } }, { npc: { count: 4 } });
// { npc: { enabled: true, count: 4 } }
```

Multiple sources are applied in order; later sources win:

```javascript
const options = Object.merge(defaults, modDefaults, playerOptions);
```

## mergefn / appendfn / coverfn

Filtered variants call a filter before each field is merged.

```javascript
maplebirch.utils.mergefn(target, (key, value, depth, targetValue) => targetValue === undefined, source);
```

Filter arguments:

| Argument      | Description                      |
| :------------ | :------------------------------- |
| `key`         | Current field name               |
| `value`       | Source value                     |
| `depth`       | Recursion depth, starting at `1` |
| `targetValue` | Existing target value            |

Examples:

```javascript
maplebirch.utils.mergefn(target, (_key, _value, _depth, targetValue) => targetValue === undefined, source);
maplebirch.utils.mergefn(target, (_key, _value, depth) => depth <= 2, source);
maplebirch.utils.mergefn(target, (_key, value) => value != null, source);
```

## contains

Arrays:

```javascript
[1, 2, 3].contains(2); // true
[1, 2, 3].contains([1, 2], 'all'); // true
[1, 2, 3].contains([2, 4], 'any'); // true
[1, 2, 3].contains([4, 5], 'none'); // true
```

Objects, `Set`, and `Map` have no `contains` instance method. Collect their values into an array first, then call the array `contains`:

```javascript
Object.values({ a: 1, b: 2 }).contains(2); // true
[...new Set(['a', 'b'])].contains('a'); // true
[...new Map([['key', 'value']]).values()].contains('value'); // true
```

Strings:

```javascript
'Hello World'.contains('World'); // true
'Hello World'.contains('hello', { case: false }); // true
```

Modes:

| Mode   | Description                     |
| :----- | :------------------------------ |
| `all`  | Every provided value must exist |
| `any`  | At least one value must exist   |
| `none` | No provided value may exist     |

Options:

| Option    | Default | Description                      |
| :-------- | :------ | :------------------------------- |
| `case`    | `true`  | Case-sensitive string comparison |
| `deep`    | `false` | Use deep equality                |
| `compare` | None    | Custom comparison function       |

```javascript
const list = [{ id: 1 }, { id: 2 }];
list.contains({ id: 1 }, 'any', { deep: true }); // true
list.contains(2, 'any', { compare: (item, value) => item.id === value }); // true
```

## random / either

`Math.random()` keeps native behavior when called without arguments:

```javascript
Math.random(); // Float from 0 to 1
```

With arguments, framework overloads apply:

```javascript
Math.random(10); // Integer from 0 to 10
Math.random(5, 10); // Integer from 5 to 10
Math.random(5, 10, true); // Float from 5 to 10
```

Array random:

```javascript
['a', 'b', 'c'].random();
```

Weighted choice:

```javascript
['rare', 'normal'].either([0.1, 0.9]);
```

Allow `null`:

```javascript
['a', 'b'].either(undefined, true);
```

For reproducible random sequences, use [randSystem](ToolCollection/randSystem.md).

## convert

```javascript
'Hello World'.convert('snake'); // hello_world
'Hello World'.convert('kebab'); // hello-world
'hello world'.convert('pascal'); // HelloWorld
'hello world'.convert('camel'); // helloWorld
```

Supported modes:

| Mode         | Example       |
| :----------- | :------------ |
| `lower`      | `hello world` |
| `upper`      | `HELLO WORLD` |
| `capitalize` | `Hello world` |
| `title`      | `Hello World` |
| `camel`      | `helloWorld`  |
| `pascal`     | `HelloWorld`  |
| `snake`      | `hello_world` |
| `kebab`      | `hello-world` |
| `constant`   | `HELLO_WORLD` |

Options:

| Option      | Default | Description                                |
| :---------- | :------ | :----------------------------------------- |
| `delimiter` | Space   | Preferred word delimiter                   |
| `acronym`   | `true`  | Preserve all-caps acronyms in `title` mode |

```javascript
'NPC name'.convert('title'); // NPC Name
'NPC name'.convert('title', { acronym: false }); // Npc Name
```

## Math.clamp

```javascript
Math.clamp('12.5', 0, 100); // 12.5
Math.clamp(120, 0, 100); // 100
Math.clamp(undefined, 0, 100, 10); // 10
```

`fallback` is used only when the input cannot become a finite number. If omitted, the lower bound is used.

`min` and `max` may be passed in reverse order:

```javascript
Math.clamp(5, 10, 0); // 5
```

## loadImage

```javascript
const result = await loadImage('img/myMod/icon.png');

if (result) {
  console.log('Image is available');
}
```

`loadImage()` first asks ModLoader for the image. If that fails, it checks the path directly.

Possible return values:

| Return                       | Description          |
| :--------------------------- | :------------------- |
| `string`                     | Available image path |
| `true`                       | Image exists         |
| `false`                      | Image unavailable    |
| `Promise<string \| boolean>` | Async result         |

Use `await` in async flows.

## Bytes and Base64

These helpers are useful for cloud saves, import/export, compression, and network requests.

```javascript
const bytes = textToBytes('hello');
const text = bytesToText(bytes);

const jsonBytes = jsonToBytes({ ok: true });
const data = bytesToJson(jsonBytes);

const base64 = bytesToBase64(bytes);
const bytesAgain = base64ToBytes(base64);
const buffer = base64ToArrayBuffer(base64);
```

| Function                      | Description                                    |
| :---------------------------- | :--------------------------------------------- |
| `textToBytes(text)`           | Convert string to `Uint8Array`                 |
| `bytesToText(bytes)`          | Convert `Uint8Array` / `ArrayBuffer` to string |
| `jsonToBytes(value)`          | Convert JSON data to bytes                     |
| `bytesToJson(bytes)`          | Convert bytes to JSON data                     |
| `toArrayBuffer(bytes)`        | Slice an exact `ArrayBuffer` from `Uint8Array` |
| `bytesToBase64(bytes)`        | Convert bytes to Base64                        |
| `base64ToBytes(base64)`       | Convert Base64 to bytes                        |
| `base64ToArrayBuffer(base64)` | Convert Base64 to `ArrayBuffer`                |
| `normalizeBase64(base64)`     | Normalize URL-safe Base64 and padding          |

## Path and Text Helpers

```javascript
trimSlashes('/a/b/'); // a/b
joinPath('/cloud/', '/slot/', '1'); // cloud/slot/1
joinEncodedPath('user name', 'slot 1'); // user%20name/slot%201
escapeHtmlText('<b>text</b>'); // &lt;b&gt;text&lt;/b&gt;
```

| Function                        | Description                                        |
| :------------------------------ | :------------------------------------------------- |
| `basicAuth(username, password)` | Generate the Base64 credential part for Basic Auth |
| `trimSlashes(value)`            | Remove leading and trailing path slashes           |
| `joinPath(...parts)`            | Join plain path parts                              |
| `joinEncodedPath(...parts)`     | Join and encode path parts                         |
| `escapeHtmlText(value)`         | Escape HTML text                                   |

## widgets

`widgets()` cleans a `.twee` import by removing the outer passage declaration.

```javascript
import Options from '@/twee/Options.twee';

const content = widgets(Options);
```

Passing multiple contents returns an array:

```javascript
const list = widgets(Options, Cheats);
```

## SelectCase

`SelectCase` is useful for writing chained condition/result tables.

```javascript
const result = new SelectCase().case('wolf', 'Wolf').caseIn(['cat', 'dog'], 'Animal').caseRange(0, 10, 'Low').caseIncludes('NPC', 'Character').caseRegex(/^mod:/, 'Mod').else('Unknown').match(value);
```

Common methods:

| Method                           | Description              |
| :------------------------------- | :----------------------- |
| `case(value, result)`            | Exact match              |
| `case(fn, result)`               | Predicate function       |
| `caseRange(min, max, result)`    | Numeric range            |
| `caseIn(values, result)`         | Value exists in an array |
| `caseIncludes(text, result)`     | String contains text     |
| `caseRegex(regex, result)`       | Regex match              |
| `caseCompare(op, value, result)` | Numeric comparison       |
| `else(result)`                   | Default result           |
| `match(value, meta)`             | Execute matching         |

## Global Functions

Common helpers are also available globally (equivalent to the `maplebirch.utils` functions):

```javascript
clone(source);
equal(a, b);
merge(target, source);
append(target, source);
cover(target, source);
contains(list, value);
random(1, 10);
either(list);
convert('Hello World', 'snake');
clamp(value, 0, 100);
loadImage(src);
```

New code should prefer `maplebirch.utils` functions or static methods because they make it clearer which value is being operated on.
