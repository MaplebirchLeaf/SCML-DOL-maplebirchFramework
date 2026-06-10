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
