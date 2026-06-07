# Weather Events

Weather events let a mod react to weather changes, patch weather layers and effects, or register custom weather data.

Use:

```javascript
maplebirch.dynamic.regWeatherEvent(eventId, options);
maplebirch.dynamic.delWeatherEvent(eventId);
maplebirch.dynamic.Weather.addLayer(layerName, patch, mode);
maplebirch.dynamic.Weather.addEffect(effectName, patch, mode);
maplebirch.dynamic.addWeather(data);
```

When your file is loaded through the recommended `script` option, the framework handles the registration timing for weather layer patches.

## Registering A Weather Event

```javascript
maplebirch.dynamic.regWeatherEvent('myMod.rainyDay', {
  condition: () => Weather.name === 'rain',
  onEnter: () => {
    V.myModRaining = true;
    Wikifier.wikifyEval('<<notify "Rain begins.">>');
  },
  onExit: () => {
    V.myModRaining = false;
    Wikifier.wikifyEval('<<notify "The rain stops.">>');
  },
  priority: 5
});
```

## Options

| Option | Type | Description |
| :--- | :--- | :--- |
| `condition` | function | Returns whether the event is active |
| `onEnter` | function | Runs once when the condition becomes true |
| `onExit` | function | Runs once when the condition becomes false |
| `once` | boolean | Remove after the event completes |
| `priority` | number | Higher runs earlier |
| Custom fields | any | Can be used for weather-state matching |

## Field Matching

```javascript
maplebirch.dynamic.regWeatherEvent('myMod.coldNight', {
  weather: ['clear', 'partlyCloudy'],
  temp: { max: 5 },
  hour: { min: 20, max: 6 },
  season: ['winter', 'autumn'],
  onEnter: () => {
    V.myModFeelsCold = true;
  },
  onExit: () => {
    V.myModFeelsCold = false;
  }
});
```

## Patching Layers And Effects

```javascript
maplebirch.dynamic.Weather
  .addLayer('rain', { animation: { speed: 2 } }, 'merge')
  .addEffect('thunder', { volume: 0.8 }, 'merge');
```

Patch modes are usually `replace`, `merge`, or `concat`.

## Adding Weather Data

```javascript
maplebirch.dynamic.addWeather({
  name: 'acidRain',
  iconType: 'acid',
  value: 10,
  probability: {
    summer: 0.1,
    winter: 0.05,
    spring: 0.2,
    autumn: 0.15
  },
  overcast: 0.8,
  precipitationIntensity: 0.7,
  visibility: 0.4
});
```

You can also add special weather exceptions, such as a specific date with a forced weather type.
