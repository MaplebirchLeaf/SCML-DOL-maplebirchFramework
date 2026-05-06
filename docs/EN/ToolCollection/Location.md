# Location Config

Location config modifies or extends vanilla `setup.LocationImages` and `setup.Locations`. It is useful for adding conditional location layers based on weather, time, or story state.

Use:

```javascript
maplebirch.tool.other.configureLocation(locationId, config, options);
```

## Minimal Example

```javascript
maplebirch.tool.other.configureLocation(
  'lake_ruin',
  {
    condition: () => Weather.bloodMoon && !Weather.isSnow
  },
  {
    layer: 'base',
    element: 'bloodmoon'
  }
);
```

This merges the condition into `lake_ruin.base.bloodmoon`.

## Arguments

| Argument | Description |
| :--- | :--- |
| `locationId` | Key in `setup.LocationImages` |
| `config` | Location image config |
| `options` | Controls merge target and overwrite behavior |

Common config fields:

| Field | Description |
| :--- | :--- |
| `condition` | Function returning whether the layer is used |
| `folder` | Image folder |
| `base` | Base layer config |
| `emissive` | Emissive layer config |
| `reflective` | Reflective layer config |
| `layerTop` | Top layer config |
| `customMapping` | Custom location mapping |

Options:

| Field | Description |
| :--- | :--- |
| `layer` | Target layer, such as `base` or `layerTop` |
| `element` | Target element inside the layer |
| `overwrite` | Replace the whole location config |

## Add A Layer Element

```javascript
maplebirch.tool.other.configureLocation(
  'forest_clearing',
  {
    condition: () => Weather.name === 'rain'
  },
  {
    layer: 'base',
    element: 'rainy'
  }
);
```

## Merge Full Config

```javascript
maplebirch.tool.other.configureLocation('old_ruins', {
  folder: 'locations/old_ruins',
  base: {
    default: {
      condition: () => true
    }
  }
});
```

## Overwrite A Location

```javascript
maplebirch.tool.other.configureLocation(
  'old_ruins',
  {
    folder: 'locations/ruins_remastered',
    base: {
      main: {
        condition: () => true
      }
    }
  },
  {
    overwrite: true
  }
);
```

Keep `condition` functions focused on checks. Avoid changing game state inside location conditions.
