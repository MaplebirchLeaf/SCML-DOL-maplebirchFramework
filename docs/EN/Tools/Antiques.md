# Antiques

Antique registration adds new museum antique text and collection state.

## Entry Point

```javascript
maplebirch.tool.patch.antiques.add(key, config);
```

Register during startup. The framework merges text after `museumAntiqueText` and invokes vanilla `museumAntiqueStatus` during donation without changing widget source. Starting or loading a game only fills missing collection entries and preserves progress.

`inject(data)` manually merges into and returns the supplied object; normal registration does not need it. The Mod still provides assets, discovery stories and `Museum <name>` passages.

## Minimal Example

```javascript
maplebirch.tool.patch.antiques.add('antiquemyitem', {
  hint: '"For a curious little relic," Winter says.',
  museum: 'The curious relic rests on a pedestal.',
  name: 'Curious Relic',
  cn_name: '奇妙遗物',
  journal: '"A curious little relic."',
  journalName: 'Small relic',
  icon: 'antiques/my-relic.png'
});
```

## Config Fields

| Field         | Description                                     |
| :------------ | :---------------------------------------------- |
| `hint`        | Winter hint text                                |
| `museum`      | Display text after the antique is in the museum |
| `name`        | True name                                       |
| `cn_name`     | Optional Chinese display name                   |
| `journal`     | Journal description                             |
| `journalName` | Optional journal display name                   |
| `icon`        | Icon path                                       |
| `key`         | Unique id when using array config               |

## State Flow

Antique state is still controlled by vanilla **`<<museumAntiqueStatus key status>>`**. Common states:

```text
notFound -> found -> talk -> museum
```

**`stolen`** and **`recovered`** also exist. The framework only registers text and default state; _discovery locations and rewards should remain in your own passages_.

```twine
<<set $antiquemoney += 4000>>
<<museumAntiqueStatus "antiquemyitem" "found">>
```

## boot.json

Object-map form. _This is the recommended format when registering multiple entries._

```json
{
  "framework": {
    "antiques": {
      "antiquemyitem": {
        "hint": "\"For a curious little relic,\" Winter says.",
        "museum": "The curious relic rests on a pedestal.",
        "name": "Curious Relic",
        "cn_name": "奇妙遗物",
        "journal": "\"A curious little relic.\"",
        "journalName": "Small relic",
        "icon": "antiques/my-relic.png"
      },
      "antiquemycoin": {
        "hint": "\"For a small old coin,\" Winter says.",
        "museum": "The old coin rests in a small display case.",
        "name": "Old Coin",
        "journal": "\"A small old coin.\"",
        "icon": "antiques/my-coin.png"
      }
    }
  }
}
```

External **`.json`**, **`.yaml`**, or **`.yml`** file. The file can use the same object-map format:

```json
{
  "framework": {
    "antiques": "data/antiques.yaml"
  }
}
```

Array form is also supported. Each item must include **`key`**:

```yaml
- key: antiquemyitem
  hint: '"For a curious little relic," Winter says.'
  museum: The curious relic rests on a pedestal.
  name: Curious Relic
  cn_name: 奇妙遗物
  journal: '"A curious little relic."'
  journalName: Small relic
  icon: antiques/my-relic.png
- key: antiquemycoin
  hint: '"For a small old coin," Winter says.'
  museum: The old coin rests in a small display case.
  name: Old Coin
  journal: '"A small old coin."'
  icon: antiques/my-coin.png
```
