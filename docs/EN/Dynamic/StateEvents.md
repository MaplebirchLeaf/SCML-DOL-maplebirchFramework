# State Events

A conversation may need a short notice at the end of the page. Another event may need to wait until the player returns to a particular location. State events provide a place for both.

The framework checks `gate` before passage content and `append` after it. Register the event in a loading script or module `preInit()`, then let page checks handle it instead of registering again on each render.

The [NPC park-meeting example](../NamedNPC/Example.md) uses `append` for its first-conversation notice. Trust changes in the player's click action; the notice tells the player what happened.

## Design the Trigger and Completion

| Stage          | Responsibility                                | Reminder example                    |
| :------------- | :-------------------------------------------- | :---------------------------------- |
| Saved defaults | Fill missing state without resetting progress | `noticePending` defaults to `false` |
| Actual action  | Queue pending work                            | Set it to `true` after success      |
| `cond`         | Query eligibility and page scope              | Read the pending flag               |
| `action`       | Synchronously settle or consume state         | Clear the dispatched flag           |
| Output widget  | Display the result or offer follow-up actions | Reminder text and any required exit |

Think of the pending flag as a note for the next page: an action writes it, the condition reads it, and the handler clears it as it prepares the output. See the [development workflow](../Development.md#separate-registration-from-saved-defaults) for initialization and load-time defaults. If the notice never appears, first check that its action actually set the flag to `true`.

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
  extra: {
    exclude: ['Start', 'Start2']
  }
});
```

```twine
:: My Mod Notices [widget]
<<widget 'myModNotice'>>
  <span class='teal'>Something needs your attention.</span><br><br>
<</widget>>
```

Here `action` clears the flag before the output widget renders, recording that the reminder has been handed to the page. Let the widget display its text directly: another `noticePending` check would hide it because the flag has already been cleared. Player acknowledgement needs a click handler like the one below.

For an acknowledgement-based reminder, remove `action` from the registration above, retain `cond`, and replace the widget with:

```twine
:: My Mod Notices [widget]
<<widget 'myModNotice'>>
  <span class='teal'>Something needs your attention.</span>
  <<linkreplace 'Understood'>>
    <<set $myMod.noticePending to false>>
    Acknowledged.
  <</linkreplace>>
  <br><br>
<</widget>>
```

Choose one consumption method rather than registering the same ID twice. The second retains pending state until clicked and appears again on an eligible page or when loading an unacknowledged save. State events provide checks and output, not persistent read receipts. An inline `linkreplace` does not create a new history moment. To capture acknowledgement in the next saved snapshot, clear the flag in the link that actually leaves the notice scene.

## Replacing Passage Content

```javascript
maplebirch.dynamic.regStateEvent('gate', 'myMod:encounter', {
  output: 'myModEncounter',
  cond: () => V.myMod?.encounterPending === true,
  forceExit: true,
  priority: 10,
  extra: {
    passage: ['My Mod Road']
  }
});
```

The output widget must provide a complete scene and usable exit. The example passages belong to the mod, rather than vanilla:

```twine
:: My Mod Encounters [widget]
<<widget 'myModEncounter'>>
  Someone blocks the road.<br><br>
  <<link 'Leave' 'My Mod Safe Place'>>
    <<set $myMod.encounterPending to false>>
  <</link>>
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
