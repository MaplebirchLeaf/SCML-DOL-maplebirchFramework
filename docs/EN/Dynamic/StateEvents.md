# State Events

State events are checked automatically before passage content (`gate`) or after it (`append`). Register them during script loading or module `preInit()`, rather than registering again on every render.

## Entry Points

```javascript
maplebirch.dynamic.regStateEvent('gate', 'myMod:notice', options);
maplebirch.dynamic.delStateEvent('gate', 'myMod:notice');
```

Both return a success boolean. Each event type has its own registry and rejects duplicate IDs.

## Execution Order

Gate events are nonblocking by default. Matching nonblocking events run their actions in descending priority order and collect output. Blocking candidates run last and recheck their conditions. The first candidate that produces output and still requests an exit ends the passage body. An action without output cannot interrupt it by itself.

Conditions and function-valued `forceExit` must be side-effect-free and may run more than once. Put state changes needed by later events in `action`, rather than in an output macro that has not rendered yet.

Append events collect output at the end of the passage. Use gate for passage-start reminders. Either type may provide only an action. `once: true` removes the registration for the current runtime, rather than storing a save-specific flag. Reminders that must only appear once per save also need saved acknowledgement state.

## Options

| Field           | Default        | Meaning                                            |
| :-------------- | :------------- | :------------------------------------------------- |
| `output`        | None           | Widget name, not arbitrary Twine text              |
| `action()`      | None           | Synchronous state update                           |
| `cond()`        | Returns `true` | Eligibility check                                  |
| `priority`      | `0`            | Higher values run first                            |
| `once`          | `false`        | Remove the runtime registration after triggering   |
| `forceExit`     | `false`        | Boolean or function, blocking only for gate events |
| `extra.passage` | None           | Allowed passage-title array                        |
| `extra.exclude` | None           | Excluded passage-title array                       |
| `extra.match`   | None           | Passage-title regular expression                   |

All scope conditions apply together. Condition and action failures are logged in framework diagnostics.

## Passage-Start Reminder

Create `V.myMod` during your mod’s state initialization. Register the event in JavaScript and define the output widget in Twee:

```javascript
maplebirch.dynamic.regStateEvent('gate', 'myMod:notice', {
  output: 'myModNotice',
  cond: () => V.myMod?.noticePending === true,
  action: () => {
    V.myMod.noticePending = false;
  },
  forceExit: false,
  extra: { exclude: ['Start', 'Start2'] }
});
```

```twine
:: My Mod Notices [widget]
<<widget 'myModNotice'>>
  <span class='teal'>Something needs your attention.</span><br><br>
<</widget>>
```

## Replacing Passage Content

```javascript
maplebirch.dynamic.regStateEvent('gate', 'myMod:encounter', {
  output: 'myModEncounter',
  cond: () => V.myMod?.encounterPending === true,
  forceExit: true,
  priority: 10,
  extra: { passage: ['My Mod Road'] }
});
```

The output widget must provide a complete scene and usable exit. The example passages belong to the mod, rather than vanilla:

```twine
:: My Mod Encounters [widget]
<<widget 'myModEncounter'>>
  Someone blocks the road.<br><br>
  <<lanLink ['Leave', '离开'] 'My Mod Safe Place'>>
    <<set $myMod.encounterPending to false>>
  <</lanLink>>
<</widget>>
```

## Passage-End Addition

```javascript
maplebirch.dynamic.regStateEvent('append', 'myMod:footer', {
  output: 'myModFooter',
  cond: () => V.myMod?.showFooter === true
});
```

Displaying a trait, feat, or footer message does not prove that an action has completed. Settle purchase, collection, or completion rewards in a verified success branch.
