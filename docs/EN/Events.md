# Events

> [!TIP]
> Use `maplebirch.on()`, `once()`, `off()`, and `after()` in ordinary mod scripts; direct access to the internal emitter is unnecessary.

## Purpose

The event emitter lets mods run code during framework or SugarCube lifecycle events, or define custom events for their own scripts.

## Entry Points

```javascript
maplebirch.on(eventName, callback, description);
maplebirch.once(eventName, callback, description);
maplebirch.off(eventName, identifier);
await maplebirch.trigger(eventName, ...args);
maplebirch.after(eventName, callback);
```

### DOM controls

`on()` receives lifecycle events forwarded by the framework and custom events sent with `trigger()`. Controls handle DOM events such as input `change` and link `click`.

For a Twee interface you own, its container can refresh through `onchange`. To read state before a native link executes, use the passage lifecycle to attach a capture listener to the current content:

```javascript
function capture(event) {
  // Observe passage links only; ignore other clicks.
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest('a[data-passage]');
  if (!link) return;

  // Capture runs before the normal link click handler, so inspect money before the action.
  console.log({
    destination: link.getAttribute('data-passage'),
    moneyBefore: V.money
  });
}

maplebirch.on(':passagerender', (_passage, content) => {
  content.addEventListener('click', capture, true);
});
```

The listener can be collected with the old content instead of remaining on `document`. Registering the same function on the same node again does not add another listener.

## Example

```javascript
maplebirch.on(
  ':passagestart',
  () => {
    console.log('passage started');
  },
  'myMod:passage-hook'
);
```

Remove it:

```javascript
maplebirch.off(':passagestart', 'myMod:passage-hook');
```

## Custom Events

`trigger()` runs listeners in registration order and waits for asynchronous callbacks. Use a mod prefix such as `myMod:eventName`. Registering the same function twice returns `false`.

```javascript
maplebirch.on('myMod:refresh', data => {
  console.log(data);
});

await maplebirch.trigger('myMod:refresh', {
  source: 'options'
});
```

## Common Events

| Event             | Use                        |
| :---------------- | :------------------------- |
| `:storyready`     | SugarCube story is ready   |
| `:passageinit`    | Passage init               |
| `:passagestart`   | Passage starts             |
| `:passagedisplay` | Passage displayed          |
| `:passageend`     | Passage ends               |
| `:onSave`         | Save hook                  |
| `:onLoad`         | Load hook                  |
| `:language`       | Framework language changed |

## After an Event

Use `after()` for one callback after this round of listeners finishes. This example uses the imported `myMod:title` translation key and an existing title element:

```javascript
maplebirch.after(':language', () => {
  const title = document.querySelector('.my-mod-title');
  if (title) title.textContent = maplebirch.t('myMod:title');
});
```

`after()` runs once. Use `on(':language', ...)` to refresh after every language change.

`:sugarcube`, `:idbReady`, `:storyready`, `:modLoaderEnd` and `:language` retain their latest arguments. Listeners registered after they finish can receive that result immediately:

```javascript
// Runs once even if the story was ready before this script loaded.
maplebirch.once(':storyready', () => {
  console.log('The story is ready for page integration.');
});
```

## Save and Load

`:onSave` and `:onLoad` callbacks must be synchronous: SugarCube does not wait for promises. The framework reports asynchronous callbacks and continues with the remaining synchronous listeners.

The callback receives `save`, which provides `saveObj`, `details`, `V`, and `use()`. `save.V` contains the variables being saved or loaded; during a load callback, global `V` still belongs to the current game.

```javascript
function initMyMod(variables) {
  variables.myMod ??= {};
  variables.myMod.flags ??= {};
  variables.myMod.flags.metLuna ??= false; // Keep an existing first-meeting flag.
}

// Initialize current variables for a new game.
maplebirch.tool.onInit(() => initMyMod(V));

maplebirch.on(':onLoad', save => {
  // Prepare the incoming save; using initMyMod(V) here would edit the current game.
  initMyMod(save.V);
});
```

The initializer above accepts a variables object, allowing new games and loads to share it. During the load callback, global `V` still refers to the current game; `save.V` is the incoming save.

If an existing initializer can only use global `V`, use this alternative:

```javascript
function initMyModWithGlobalV() {
  V.myMod ??= {};
  V.myMod.flags ??= {};
  V.myMod.flags.metLuna ??= false;
}

maplebirch.tool.onInit(initMyModWithGlobalV);
maplebirch.on(':onLoad', save => {
  // Temporarily expose a copy of the incoming variables through V during this call.
  save.use(save.V, initMyModWithGlobalV);
});
```

`use()` writes changes back on success and discards the copy's changes on error, restoring the live variables afterward. Keep its callback synchronous; do not await requests inside it. Static `setup` registration still belongs in startup initialization.
