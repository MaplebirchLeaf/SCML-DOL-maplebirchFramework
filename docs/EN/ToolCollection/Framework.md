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

## Source Patches

Use `maplebirch.tool.zone.inject()` when no render hook fits and an internal execution branch must be changed. Put ordinary passages in `locationPassage` and widget-tagged passages in `widgetPassage`.

```javascript
maplebirch.tool.zone.inject({
  locationPassage: {
    'MyMod Reward': [
      {
        src: '<<set $myMod.rewardClaimed to true>>',
        applyafter: '<<myModRewardSettled>>',
        expected: 1
      }
    ]
  }
});
```

This example uses Mod-owned names and state. Vanilla adapters must use a verified settlement point. Inserting into the successful branch can represent reward settlement; page rendering alone cannot.

| Field                        | Behavior                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `src`                        | Matches literal text and replaces the first occurrence                       |
| `srcmatch`                   | Regex replacement; `g` processes every match                                 |
| `srcmatchgroup`              | Processes all regex matches without re-scanning newly inserted content       |
| `to`                         | Replacement text, supporting JavaScript replace capture references           |
| `applybefore` / `applyafter` | Inserts literal text before/after each match                                 |
| `expected`                   | Optional expected match count; mismatch skips the patch and records mismatch |

Use one matcher and one operation per entry. `matches` counts candidates; `applied` counts replacements. A literal `src` found twice but replaced once reports 2 and 1 respectively. See [patch reports](../AddonPlugin.md#patch-reports) for missing targets and other failures.

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
