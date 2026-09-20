# Event Emitter

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

## Example

```javascript
maplebirch.on(
  ':passagestart',
  () => {
    console.log('passage started');
  },
  'myMod passage hook'
);
```

Remove it:

```javascript
maplebirch.off(':passagestart', 'myMod passage hook');
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

`after()` runs once after the event's listeners finish. The latest arguments are retained for `:sugarcube`, `:idbReady`, `:storyready`, `:modLoaderEnd`, and `:language`. Once one of these events has completed, newly registered `on()`, `once()`, and `after()` callbacks receive those arguments immediately.

## Save and Load

`:onSave` and `:onLoad` callbacks must be synchronous: SugarCube does not wait for promises. The framework reports asynchronous callbacks and continues with the remaining synchronous listeners.

The callback receives `save`, which provides `saveObj`, `details`, `V`, and `use()`. `save.V` contains the variables being saved or loaded; during a load callback, global `V` still belongs to the current game.

```javascript
maplebirch.on(':onLoad', save => {
  save.V.myMod ??= {};
  save.V.myMod.flags ??= {};
});
```

Use `save.use(save.V, () => { /* synchronous initialization */ })` for existing logic that requires global `V`. Changes are written back on success and discarded on error; the live variables are restored afterward. Static `setup` registrations still belong in startup initialization.
