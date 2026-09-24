# HTML Tools

Use `maplebirch.tool.text` to register content, build fragments and edit existing nodes. For widgets, pass the fragment received by the hook. Replacement methods default to the current page's `#passage-content` only when no root is supplied.

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
    const label = tools.context.label;
    if (typeof label === 'string') tools.text(label, 'gold');
  },
  'myMod:label'
);

maplebirch.wikify('myMod:relationship', {
  afterWidget(_source, name, passageTitle, _passage, node) {
    if (name !== 'relationshiptext') return;
    text.renderInto(node, 'myMod:relationship', {
      widgetName: name,
      passageTitle,
      label: 'Relationship details'
    });
  }
});
```

This appends content after every `relationshiptext` invocation without replacing its source. A real Mod should narrow the target by passage, NPC or display conditions. See [ModLoader Integration](../AddonPlugin.md#render-hooks) for hooks.

## Registration and Rendering

| Method                             | Behavior                                                                                                       |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `add(key, handler, id?)`           | Returns a handler ID; an existing ID under the same key is replaced. Invalid arguments return `false`          |
| `delete(key, idOrHandler?)`        | Removes a handler, or the entire key when the second argument is omitted; returns whether anything was removed |
| `clear()`                          | Removes all text handlers                                                                                      |
| `renderFragment(keys, context?)`   | Returns a new fragment                                                                                         |
| `renderInto(root, keys, context?)` | Appends content to an `Element` or `DocumentFragment`                                                          |
| `render(macro, keys)`              | Renders into a SugarCube macro's output with its context                                                       |

`keys` accepts a string or string array. Handlers run in order; a failing handler is logged without stopping subsequent handlers. Context `args` is a readonly `unknown[]`; `name`, `widgetName` and `passageTitle` are optional strings. Custom fields are `unknown` and require narrowing before use. Macro rendering exposes the complete MacroContext through `context.macro`.

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
maplebirch.wikify('myMod:links', {
  afterWidget(_source, name, _title, _passage, node) {
    if (name !== 'myModMenu') return;
    const link = node.querySelector('a[data-passage="Town"]');
    if (link) maplebirch.tool.text.renameLink(link, 'Visit town');
  }
});
```

| Method                                   | Behavior                                                                                                                         |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `replaceText(oldText, newText, root?)`   | Replaces matches within individual text nodes and returns the count; skips script/style/textarea and does not match across nodes |
| `renameLink(target, label, root?)`       | Changes the label while retaining the link element, attributes, destination and its listeners; returns whether a link was found  |
| `replaceLink(target, wikiSource, root?)` | Replaces the entire link with newly wikified content, discarding its listeners; returns whether replacement succeeded            |

Prefer passing an already selected element as `target`; it is edited directly. A string selects the first `.macro-link` or `.link-internal` whose displayed text contains that string within root. Text arguments retain `lanSwitch` translation. Element selection or `data-passage` avoids depending on the display language.

`renameLink` replaces label contents, so existing child nodes are removed. `replaceLink` parses before replacing; exceptions or generated `.error` elements leave the original link in place. Wiki side effects during parsing are not rolled back.
