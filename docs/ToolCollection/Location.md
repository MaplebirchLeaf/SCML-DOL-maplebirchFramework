## 地点配置系统 (Location Configuration)

### 基本介绍

`Location` 是框架提供的地点图片配置系统，允许模组制作者为游戏中的地点(location)配置不同的图片显示条件。通过这个系统，您可以根据天气、时间、事件等条件动态改变地点的外观。
_可通过 `maplebirch.tool.other.configureLocation()` 访问。_

---

### 核心功能

#### **配置地点 (configureLocation)**

- 为特定地点配置图片显示条件
- **@param**:
  - `locationId` (string): 地点ID
  - `config` (LocationConfig): 配置对象
  - `options` (LocationConfigOptions, 可选): 配置选项
- **@return**: boolean，表示是否配置成功
- **@example**:
  ```javascript
  // 为湖中废墟配置血月条件的图片
  maplebirch.tool.other.configureLocation(
    'lake_ruin',
    {
      condition: () => Weather.bloodMoon && !Weather.isSnow
    },
    { layer: 'base', element: 'bloodmoon' }
  );
  ```

---

### 配置参数说明

#### **LocationConfig 对象**

| 属性            | 类型     | 说明                                   |
| :-------------- | :------- | :------------------------------------- |
| `condition`     | function | 条件函数，返回布尔值表示是否应用此配置 |
| `folder`        | string   | 图片文件夹路径                         |
| `base`          | object   | 基础层图片配置                         |
| `emissive`      | object   | 自发光层图片配置                       |
| `reflective`    | object   | 反射层图片配置                         |
| `layerTop`      | object   | 顶层图片配置                           |
| `customMapping` | any      | 自定义映射配置                         |

#### **LocationConfigOptions 选项**

| 属性        | 类型    | 说明                                                |
| :---------- | :------ | :-------------------------------------------------- |
| `overwrite` | boolean | 是否完全覆盖现有配置，默认 false                    |
| `layer`     | string  | 指定要配置的图层(base/emissive/reflective/layerTop) |
| `element`   | string  | 指定要配置的元素(图片名称)                          |

---

### 基本使用示例

#### **示例1：根据天气配置图片**

```javascript
// 晴朗天气的配置
maplebirch.tool.other.configureLocation(
  'forest_clearing',
  {
    condition: () => Weather.name === 'clear' && !Weather.bloodMoon
  },
  { layer: 'base', element: 'forest_sunny' }
);

// 下雨天气的配置
maplebirch.tool.other.configureLocation(
  'forest_clearing',
  {
    condition: () => Weather.name === 'rain'
  },
  { layer: 'base', element: 'forest_rainy' }
);

// 下雪天气的配置
maplebirch.tool.other.configureLocation(
  'forest_clearing',
  {
    condition: () => Weather.name === 'snow'
  },
  { layer: 'base', element: 'forest_snowy' }
);
```

#### **示例2：血月特殊条件**

```javascript
// 原版的例子：血月非雪天
maplebirch.tool.other.configureLocation(
  'lake_ruin',
  {
    condition: () => Weather.bloodMoon && !Weather.isSnow
  },
  { layer: 'base', element: 'bloodmoon' }
);

// 原版的例子：血月下雪天
maplebirch.tool.other.configureLocation(
  'lake_ruin',
  {
    condition: () => Weather.bloodMoon && Weather.isSnow
  },
  { layer: 'base', element: 'bloodmoon_snow' }
);
```

#### **示例3：根据时间配置**

```javascript
// 白天的配置
maplebirch.tool.other.configureLocation(
  'town_square',
  {
    condition: () => Time.hour >= 6 && Time.hour < 18
  },
  { layer: 'base', element: 'town_day' }
);

// 夜晚的配置
maplebirch.tool.other.configureLocation(
  'town_square',
  {
    condition: () => Time.hour < 6 || Time.hour >= 18
  },
  { layer: 'base', element: 'town_night' }
);
```

#### **示例4：组合条件**

```javascript
// 冬季下雪的夜晚
maplebirch.tool.other.configureLocation(
  'mountain_pass',
  {
    condition: () => {
      return Time.season === 'winter' && Weather.name === 'snow' && (Time.hour < 6 || Time.hour >= 18);
    }
  },
  { layer: 'base', element: 'mountain_winter_night' }
);
```

#### **示例5：特殊事件触发**

```javascript
// 节日特殊装饰
maplebirch.tool.other.configureLocation(
  'main_street',
  {
    condition: () => {
      const today = new DateTime(Time.date);
      return (
        (today.month === 12 && today.day >= 20 && today.day <= 26) || // 圣诞节
        (today.month === 10 && today.day === 31)
      ); // 万圣节
    }
  },
  { layer: 'layerTop', element: 'festival_decorations' }
);
```

### 特殊配置选项

#### **覆盖模式 (overwrite)**

```javascript
// 完全覆盖现有配置
maplebirch.tool.other.configureLocation(
  'old_ruins',
  {
    folder: 'locations/ruins_remastered',
    base: { main: 'ruins_new' }
  },
  { overwrite: true } // 清空所有现有配置
);
```

#### **指定图层和元素**

```javascript
// 只修改特定图层的特定元素
maplebirch.tool.other.configureLocation(
  'harbor',
  {
    condition: () => Weather.name === 'storm'
  },
  { layer: 'emissive', element: 'lighthouse' } // 只修改灯塔的自发光效果
);
```

```javascript
// 这个配置会优先检查
maplebirch.tool.other.configureLocation(
  'test_location',
  {
    condition: () => Weather.bloodMoon // 血月条件
  },
  { layer: 'base', element: 'bloodmoon' }
);

// 这个配置在血月条件之后检查
maplebirch.tool.other.configureLocation(
  'test_location',
  {
    condition: () => Weather.name === 'rain' // 下雨条件
  },
  { layer: 'base', element: 'rainy' }
);

// 默认配置(无条件)
maplebirch.tool.other.configureLocation(
  'test_location',
  {
    // 无条件，总是匹配
  },
  { layer: 'base', element: 'default' }
);
```
