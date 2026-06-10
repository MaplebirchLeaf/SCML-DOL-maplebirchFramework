# State Events

State events are part of the dynamic system. They let a mod inject content when a passage starts or ends, without manually editing the target passage.

Use:

```javascript
maplebirch.dynamic.regStateEvent(type, eventId, options);
maplebirch.dynamic.delStateEvent(type, eventId);
```

## Event Types

| Type     | Timing        | Behavior                                          |
| :------- | :------------ | :------------------------------------------------ |
| `gate`   | Passage start | Can interrupt or replace the current passage flow |
| `append` | Passage end   | Appends extra output after the passage content    |

## Registering An Event

```javascript
maplebirch.dynamic.regStateEvent('gate', 'myMod.forestBandit', {
  output: 'myModForestBandit',
  cond: () => V.location === 'forest' && Time.hour >= 20,
  priority: 10,
  once: false
});
```

The `output` value is the name of a SugarCube widget:

```html
<<widget 'myModForestBandit'>>
  <div class="encounter">
    <strong>A shadow moves between the trees.</strong>
    <<link "Approach" "ForestBandit">><</link>>
    <<link "Leave" "ForestPath">><</link>>
  </div>
<</widget>>
```

## Options

| Option          | Type             | Description                                          |
| :-------------- | :--------------- | :--------------------------------------------------- |
| `output`        | string           | Widget name to render                                |
| `action`        | function         | JavaScript callback to run                           |
| `cond`          | function         | Condition function                                   |
| `priority`      | number           | Higher runs earlier                                  |
| `once`          | boolean          | Remove after first trigger                           |
| `forceExit`     | boolean/function | Force the current passage to stop, mainly for `gate` |
| `extra.passage` | string[]         | Only trigger in these passages                       |
| `extra.exclude` | string[]         | Do not trigger in these passages                     |

## Append Example

```javascript
maplebirch.dynamic.regStateEvent('append', 'myMod.wetHint', {
  output: 'myModWetHint',
  cond: () => V.wetness > 70,
  priority: 3
});
```

```html
<<widget 'myModWetHint'>>
  <div class="status-overlay wet">Your clothes are soaked.</div>
<</widget>>
```

## Removing An Event

```javascript
maplebirch.dynamic.delStateEvent('gate', 'myMod.forestBandit');
```

Keep `cond` lightweight because state events are checked automatically during passage rendering.
