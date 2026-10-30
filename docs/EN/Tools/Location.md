# Location Config

Location config modifies or extends vanilla `setup.LocationImages` and `setup.Locations`. It is useful for adding conditional location layers based on weather, time, or story state.

Use:

```javascript
maplebirch.tool.patch.location.configure(locationId, config, options);
```

## Minimal Example

```javascript
maplebirch.tool.patch.location.configure(
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
| `weather`       | Fog, rain splashes and ground boundaries     |
| `customMapping` | Custom location mapping                      |

Keep `condition` functions focused on checks. Avoid changing game state inside location conditions.

`folder` is relative to vanilla `img/misc/locations/`, and image layer elements need an `image` filename. New or overwritten locations receive defaults for missing weather fields: fog and rain splashes are disabled, the fog distribution curve is `1`, and both ground boundaries have `top` and `bottom` set to `0`. Partial weather and boundary objects keep explicit values and receive only missing defaults. Ordinary updates to existing locations do not reset vanilla weather settings.

Options:

| Field       | Description                                |
| :---------- | :----------------------------------------- |
| `layer`     | Target layer, such as `base` or `layerTop` |
| `element`   | Target element inside the layer            |
| `overwrite` | Replace the whole location config          |

## Add A Layer Element

Supply both `layer` and `element` to add or update one element within a layer:

```javascript
maplebirch.tool.patch.location.configure(
  'forest_clearing',
  {
    condition: () => Weather.precipitation === 'rain'
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
maplebirch.tool.patch.location.configure('old_ruins', {
  folder: 'old-ruins',
  base: {
    default: {
      condition: () => true,
      image: 'base.png'
    }
  },
  weather: {
    rainSplashEnabled: true,
    fogEnabled: true,
    fogDistributionCurve: 1.2,
    groundBounds: {
      splashes: {
        top: 7,
        bottom: 0
      },
      fog: {
        top: 15,
        bottom: 0
      }
    }
  }
});
```

Ground boundaries count upward in pixels from `0` at the bottom of the image. Set the corresponding ranges to match the location image when enabling fog or splashes.

## Overwrite A Location

```javascript
maplebirch.tool.patch.location.configure(
  'old_ruins',
  {
    folder: 'ruins-remastered',
    base: {
      main: {
        condition: () => true,
        image: 'base.png'
      }
    },
    weather: {
      rainSplashEnabled: false,
      fogEnabled: false
    }
  },
  {
    overwrite: true
  }
);
```
