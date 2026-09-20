# Location Config

Location config modifies or extends vanilla `setup.LocationImages` and `setup.Locations`. It is useful for adding conditional location layers based on weather, time, or story state.

Use:

```javascript
maplebirch.tool.patch.configureLocation(locationId, config, options);
```

## Minimal Example

```javascript
maplebirch.tool.patch.configureLocation(
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

| Argument     | Description                                  |
| :----------- | :------------------------------------------- |
| `locationId` | Key in `setup.LocationImages`                |
| `config`     | Location image config                        |
| `options`    | Controls merge target and overwrite behavior |

Common config fields:

| Field           | Description                                  |
| :-------------- | :------------------------------------------- |
| `condition`     | Function returning whether the layer is used |
| `folder`        | Image folder                                 |
| `base`          | Base layer config                            |
| `emissive`      | Emissive layer config                        |
| `reflective`    | Reflective layer config                      |
| `layerTop`      | Top layer config                             |
| `customMapping` | Custom location mapping                      |

Keep `condition` functions focused on checks. Avoid changing game state inside location conditions.

Options:

| Field       | Description                                |
| :---------- | :----------------------------------------- |
| `layer`     | Target layer, such as `base` or `layerTop` |
| `element`   | Target element inside the layer            |
| `overwrite` | Replace the whole location config          |

## Add A Layer Element

Supply both `layer` and `element` to add or update one element within a layer:

```javascript
maplebirch.tool.patch.configureLocation(
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

Without `layer` and `element`, the configuration is merged into the location. Repeated configurations for the same location are merged by default.

```javascript
maplebirch.tool.patch.configureLocation('old_ruins', {
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
maplebirch.tool.patch.configureLocation(
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
