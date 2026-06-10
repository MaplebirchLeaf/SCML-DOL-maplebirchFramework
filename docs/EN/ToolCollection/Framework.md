# Zone Manager

## Purpose

Zone manager adds widgets to existing game UI areas such as Options, StatusBar, menus, link zones, journal, and social pages.

## Entry Point

```javascript
maplebirch.tool.addTo(zone, widget);
```

## Minimal Example

```twine
<<widget "MyModOptions">>
  <h3>My Mod Options</h3>
<</widget>>
```

```javascript
maplebirch.tool.addTo('Options', 'MyModOptions');
```

## boot.json

```json
"framework": {
  "addto": "Options",
  "widget": "MyModOptions"
}
```

## Widget Forms

Widget name:

```javascript
maplebirch.tool.addTo('StatusBar', 'MyModStatus');
```

Function:

```javascript
maplebirch.tool.addTo('Information', () => {
  return `Location: ${V.location}`;
});
```

Conditional config:

```javascript
maplebirch.tool.addTo('StatusBar', {
  widget: 'CombatStatus',
  passage: ['Combat', 'Struggle'],
  exclude: ['Victory']
});
```

## Common Zones

| Zone             | Position               |
| :--------------- | :--------------------- |
| `Options`        | Options page           |
| `Cheats`         | Cheats page            |
| `Information`    | Information area       |
| `Header`         | Passage header         |
| `Footer`         | Passage footer         |
| `StatusBar`      | Sidebar status         |
| `MenuBig`        | Big menu area          |
| `MenuSmall`      | Small menu area        |
| `BeforeLinkZone` | Before link area       |
| `AfterLinkZone`  | After link area        |
| `CustomLinkZone` | Specific link position |
| `Journal`        | Journal extension      |
| `MobileStats`    | Mobile stats area      |
