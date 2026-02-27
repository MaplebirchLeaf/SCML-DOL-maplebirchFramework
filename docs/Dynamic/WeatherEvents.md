## 天气事件 (WeatherEvents)

### 基本介绍

天气事件模块 (`WeatherEvents`) 是动态管理系统的一部分，用于处理游戏中的天气相关事件和效果。它允许开发者注册天气变化时触发的事件，修改天气图层和效果，以及添加自定义天气类型。

_可通过 `maplebirch.dynamic.Weather` 或快捷接口 `maplebirchFrameworks.addWeatherEvent()` 访问。_

**注意**: 图层效果修改需要在框架的 `:passagestart` 时机前(即 `init` 执行前)注册才会生效。但您只需按照推荐的 `script` 方式加载文件，框架会自动在正确的时机处理您的注册。

---

### 核心功能

#### **注册天气事件 (regWeatherEvent)**

- 注册一个新的天气事件
- **@param**:
  - `eventId` (string): 事件唯一标识符
  - `options` (WeatherEventOptions): 事件配置选项
- **@return**: boolean，表示是否成功注册
- **@example**:
  ```javascript
  // 推荐在 your-script.js 中注册
  maplebirch.dynamic.regWeatherEvent('rainyDay', {
    condition: () => Weather.name === 'rain',
    onEnter: () => {
      V.isRaining = true;
      Wikifier.wikifyEval('<<notify "开始下雨了">>');
    },
    onExit: () => {
      V.isRaining = false;
      Wikifier.wikifyEval('<<notify "雨停了">>');
    },
    priority: 5,
    once: false
  });
  ```

#### **注销天气事件 (delWeatherEvent)**

- 注销一个已注册的天气事件
- **@param**: `eventId` (string): 事件唯一标识符
- **@return**: boolean，表示是否成功注销
- **@example**:
  ```javascript
  maplebirch.dynamic.delWeatherEvent('rainyDay');
  ```

#### **添加天气图层修改 (addLayer)**

- 修改天气图层的参数
- **@param**:
  - `layerName` (string): 图层名称
  - `patch` (any): 要应用的修改
  - `mode` (string): 修改模式，支持 'concat'、'replace'、'merge'，默认为 'replace'
- **@return**: this，支持链式调用
- **@example**:
  ```javascript
  // 在 your-script.js 中修改图层
  maplebirch.dynamic.Weather.addLayer('clouds', { blur: 5, zIndex: 10 }).addLayer('rain', { animation: { speed: 2 } }, 'merge');
  ```

#### **添加天气效果修改 (addEffect)**

- 修改天气效果的参数
- **@param**:
  - `effectName` (string): 效果名称
  - `patch` (any): 要应用的修改
  - `mode` (string): 修改模式，支持 'concat'、'replace'、'merge'，默认为 'replace'
- **@return**: this，支持链式调用
- **@example**:
  ```javascript
  // 在 your-script.js 中修改效果
  maplebirch.dynamic.Weather.addEffect('lightning', { frequency: 0.5, intensity: 2 }).addEffect('thunder', { volume: 0.8 }, 'merge');
  ```

#### **添加天气数据 (addWeatherData)**

- 添加自定义天气类型或天气例外
- **@param**: `data` (WeatherTypeConfig | WeatherException): 天气配置数据
- **@return**: boolean 或 void
- **@example**:
  ```javascript
  // 在 your-script.js 中添加自定义天气
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
    cloudCount: {
      small: () => random(5, 10),
      large: () => random(2, 5)
    },
    tanningModifier: -0.5,
    overcast: 0.8,
    precipitationIntensity: 0.7,
    visibility: 0.4
  });
  ```

---

### 完整示例文件

#### **your-script.js 示例**

```javascript
(function () {
  'use strict';

  // 1. 添加自定义天气类型
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
    cloudCount: {
      small: () => random(5, 10),
      large: () => random(2, 5)
    },
    tanningModifier: -0.5,
    overcast: 0.8,
    precipitationIntensity: 0.7,
    visibility: 0.4
  });

  // 2. 注册天气事件
  maplebirch.dynamic.regWeatherEvent('acidRainEvent', {
    condition: () => Weather.name === 'acidRain',
    onEnter: () => {
      V.visibility = 0.4;
      V.health -= 2;
      Wikifier.wikifyEval('<<notify "酸雨！能见度降低，健康受损">>');
    },
    onExit: () => {
      V.visibility = 1;
      Wikifier.wikifyEval('<<notify "酸雨停了">>');
    },
    priority: 8
  });

  // 3. 修改天气图层
  maplebirch.dynamic.Weather.addLayer('rain', {
    blur: 8,
    zIndex: 12,
    animation: { speed: 3 }
  }).addEffect('acidEffect', {
    particleColor: '#8b4513',
    damageRate: 0.1
  });

  // 4. 添加节日特殊天气
  maplebirch.dynamic.addWeather({
    date: () => new DateTime(2025, 10, 31), // 万圣节
    duration: 24,
    weatherType: 'fog',
    temperature: 8
  });

  // 5. 注册万圣节天气事件
  maplebirch.dynamic.regWeatherEvent('halloweenFog', {
    condition: () => {
      const today = new DateTime(Time.date);
      return today.month === 10 && today.day === 31 && Weather.name === 'fog';
    },
    onEnter: () => {
      V.halloweenMood = 3;
      Wikifier.wikifyEval('<<notify "万圣节迷雾笼罩着大地...">>');
    },
    onExit: () => {
      V.halloweenMood = 1;
    },
    once: true
  });

  console.log('天气模组加载完成');
})();
```

---

### 事件配置选项 (WeatherEventOptions)

| 参数        | 类型     | 说明                               |
| :---------- | :------- | :--------------------------------- |
| `condition` | function | 触发条件函数，返回布尔值           |
| `onEnter`   | function | 满足条件时进入事件，执行一次       |
| `onExit`    | function | 条件不再满足时退出事件，执行一次   |
| `once`      | boolean  | 是否只触发一次(进入和退出各算一次) |
| `priority`  | number   | 优先级，数字越大优先级越高         |
| 自定义字段  | any      | 支持通过字段值匹配天气状态         |

#### **自定义字段匹配示例**

```javascript
// 在 your-script.js 中使用字段匹配
maplebirch.dynamic.regWeatherEvent('coldNight', {
  weather: ['clear', 'partlyCloudy'], // 晴朗或多云
  temp: { max: 5 }, // 温度不高于5度
  hour: { min: 20, max: 6 }, // 晚上8点到早上6点
  season: ['winter', 'autumn'], // 冬季或秋季
  onEnter: () => {
    V.feelsCold = true;
  },
  onExit: () => {
    V.feelsCold = false;
  }
});
```

---

### 注意事项

1. **加载时机**: _图层效果修改需要在框架 `init` 前注册，使用推荐的 `script` 方式会自动在正确时机执行_
2. **事件优先级**: _按优先级从高到低执行_
3. **条件检查**: _天气变化时自动检查条件函数_
4. **一次性事件**: _`once: true` 的事件触发后会自动移除_
