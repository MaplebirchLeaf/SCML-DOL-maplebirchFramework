# Text and HTML tools

Use `maplebirch.tool.text` to register content, build fragments and edit existing nodes. Pass the page root supplied by an event when editing displayed content. Replacement methods default to the current page's `#passage-content` only when no root is supplied.

## Entry Point

```javascript
maplebirch.tool.text;
```

## Minimal Example

```typescript
const text = maplebirch.tool.text;
text.add(
  'myMod:relationship',
  tools => {
    tools.text('Relationship details', 'gold');
  },
  'myMod:label'
);

maplebirch.tool.inject({
  widgetPassage: {
    'Widgets Named Npcs': [
      {
        src: '<<relationshiptext>>',
        applyafter: '<<maplebirchTextOutput "myMod:relationship">>',
        expected: 1
      }
    ]
  }
});
```

This inserts the text macro after a specific source anchor. Set `expected` to the match count in the target version; a mismatch leaves the passage unchanged and appears in the [patch report](../AddonPlugin.md#patch-reports). A real Mod should narrow the target by passage, NPC or display conditions.

## Registration and Rendering

| Method                             | Behavior                                                                                                       |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `add(key, handler, id?)`           | Returns a handler ID; an existing ID under the same key is replaced. Invalid arguments return `false`          |
| `delete(key, idOrHandler?)`        | Removes a handler, or the entire key when the second argument is omitted; returns whether anything was removed |
| `clear()`                          | Removes all text handlers                                                                                      |
| `renderFragment(keys, context?)`   | Returns a new fragment                                                                                         |
| `renderInto(root, keys, context?)` | Appends content to an `Element` or `DocumentFragment`                                                          |
| `render(macro, keys)`              | Renders into a SugarCube macro's output with its context                                                       |

Register separate keys to maintain a heading and its details independently, then render them in the desired order. This standalone example appends information only to your `My Mod Status` passage:

```typescript
const text = maplebirch.tool.text;

text.add('myMod:header', tools => {
  tools.line("Luna's news", 'gold');
});

text.add('myMod:details', tools => {
  // Custom context values are unknown; check the type before using one.
  const trust = tools.context.trust;
  if (typeof trust !== 'number' || !Number.isFinite(trust)) return;
  tools.line(`Current Trust: ${trust}`);
});

maplebirch.on(':passagedisplay', (passage, root) => {
  if (passage.title !== 'My Mod Status') return;

  text.renderInto(root, ['myMod:header', 'myMod:details'], {
    trust: C.npc.Luna?.myModTrust ?? 0 // Read current data; do not grant points while drawing.
  });
});
```

Keys render in array order, putting the heading before the details. If one handler throws, it is logged and the others continue.

Handlers can also inspect:

| Field                                | Use                                                                |
| :----------------------------------- | :----------------------------------------------------------------- |
| `args`                               | Readonly array of `unknown` arguments; narrow each item before use |
| `name`, `widgetName`, `passageTitle` | Optional names; account for missing values                         |
| `macro`                              | Complete SugarCube MacroContext when rendering through a macro     |
| Custom fields, such as `trust` above | Supplied for this render; narrow before use                        |

The macro accepts strings, string arrays and comma-separated keys:

```twine
<<maplebirchTextOutput "myMod:header,myMod:details">>
```

`makeTextOutput({ CSV: false })` creates a macro handler without comma splitting. Invalid arguments produce a macro error.

## Builder

`tools.fragment` is the current output target and `tools.context` holds the current context. Builder methods return the builder for chaining.

| Method                       | Behavior                                                        |
| ---------------------------- | --------------------------------------------------------------- |
| `text(content, className?)`  | Creates a span with translated text and one trailing space      |
| `line(content?, className?)` | Adds a line break and optional text                             |
| `wikify(content)`            | Executes Wiki syntax in the current target                      |
| `raw(content)`               | Adds a Node or literal text without translation or HTML parsing |
| `box(content, className?)`   | Creates a div, translating strings or inserting a Node          |

`text`, `line` and `wikify` accept strings, numbers and booleans; nullish values produce no text. Use `tools.raw(tools.auto(value))` when translated raw text is intended. Nodes are moved into the target; clone them yourself when reusing them.

## Editing Existing Content

```typescript
maplebirch.on(':passagedisplay', (_passage, root) => {
  const link = root.querySelector('a[data-passage="Town"]');
  if (link) maplebirch.tool.text.renameLink(link, 'Visit town');
});
```

| Method                                   | Behavior                                                                                                                         |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `replaceText(oldText, newText, root?)`   | Replaces matches within individual text nodes and returns the count; skips script/style/textarea and does not match across nodes |
| `renameLink(target, label, root?)`       | Changes the label while retaining the link element, attributes, destination and its listeners; returns whether a link was found  |
| `replaceLink(target, wikiSource, root?)` | Replaces the entire link with newly wikified content, discarding its listeners; returns whether replacement succeeded            |

Prefer passing an already selected element as `target`; it is edited directly. A string selects the first `.macro-link` or `.link-internal` whose displayed text contains that string within root. Text arguments retain `lanSwitch` translation. Element selection or `data-passage` avoids depending on the display language.

`renameLink` replaces label contents, so existing child nodes are removed. `replaceLink` parses before replacing; exceptions or generated `.error` elements leave the original link in place. Wiki side effects during parsing are not rolled back.
