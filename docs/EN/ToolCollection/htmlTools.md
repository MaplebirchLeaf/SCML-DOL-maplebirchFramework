# Text Builder

`htmlTools` provides a builder-style API for generating text, HTML, and SugarCube output. It is useful when a mod wants reusable page fragments or controlled text injection.

Access it with:

```javascript
maplebirch.tool.text;
```

## Register A Text Handler

```javascript
maplebirch.tool.text.reg('gameStatus', tools => {
  tools.text('Character status:', 'header').line(`Health: ${V.health}`).line(`Location: ${V.location}`);
});
```

Render it in SugarCube:

```html
<<maplebirchTextOutput "gameStatus">>
```

## API

| API                             | Description             |
| :------------------------------ | :---------------------- |
| `reg(key, handler, id?)`        | Register a text handler |
| `delete(key, idOrHandler?)`     | Remove a handler        |
| `replaceText(oldText, newText)` | Replace passage text    |
| `replaceLink(oldLink, newLink)` | Replace link text       |

## Builder Methods

| Method                   | Description                        |
| :----------------------- | :--------------------------------- |
| `text(content, style?)`  | Add text                           |
| `line(content?, style?)` | Add a line break and optional text |
| `wikify(content)`        | Add SugarCube wiki syntax          |
| `raw(content)`           | Add a raw node or string           |
| `box(content?, style?)`  | Add a styled container             |

Example:

```javascript
maplebirch.tool.text.reg('inventorySummary', tools => {
  const inventory = V.inventory || [];

  tools.text('Items:', 'subheader');

  if (inventory.length === 0) {
    tools.line('None');
    return;
  }

  inventory.forEach(item => {
    tools.line(`- ${item.name} x${item.quantity}`);
  });
});
```

## Text Replacement

```javascript
maplebirch.tool.text.replaceText('You see a small hut in the forest.', 'You find a small hut between the trees.');

maplebirch.tool.text.replaceLink('Enter the hut', 'Step inside');
```

## Context

Handlers can read context passed during rendering:

```javascript
maplebirch.tool.text.reg('dynamicMessage', tools => {
  const message = tools.context.message || 'Default message';
  const style = tools.context.style || '';
  tools.text(message, style);
});

const fragment = maplebirch.tool.text.renderFragment('dynamicMessage', {
  message: 'A special event begins.',
  style: 'important'
});
```

Builder output is processed through the framework text pipeline, including automatic translation where applicable.
