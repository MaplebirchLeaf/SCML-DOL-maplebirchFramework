## 地点配置

## 用来做什么

地点配置用于修改或补充原版 `setup.LocationImages` 和 `setup.Locations`。它适合根据天气、时间、事件状态等条件，为地点添加不同图层或替换图片配置。

---

## 使用入口

```javascript
maplebirch.tool.patch.configureLocation(locationId, config, options);
```

---

## 最小写法

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

这会向 `lake_ruin` 的 `base.bloodmoon` 配置中合并一个条件。

---

## 参数

### locationId

地点 ID，对应原版 `setup.LocationImages` 中的键名。

```javascript
'lake_ruin';
```

### config

地点图片配置。

| 字段            | 说明                         |
| :-------------- | :--------------------------- |
| `condition`     | 条件函数，返回是否使用该配置 |
| `folder`        | 图片文件夹                   |
| `base`          | 基础层                       |
| `emissive`      | 自发光层                     |
| `reflective`    | 反射层                       |
| `layerTop`      | 顶层                         |
| `customMapping` | 自定义地点映射               |

### options

| 字段        | 说明                                                      |
| :---------- | :-------------------------------------------------------- |
| `layer`     | 指定图层，如 `base`、`emissive`、`reflective`、`layerTop` |
| `element`   | 指定图层内元素                                            |
| `overwrite` | 是否覆盖整个地点配置                                      |

---

## 按图层添加条件

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

也可以添加顶层装饰：

```javascript
maplebirch.tool.patch.configureLocation(
  'main_street',
  {
    condition: () => V.myMod?.festival === true
  },
  {
    layer: 'layerTop',
    element: 'festival_decorations'
  }
);
```

---

## 合并完整配置

不传 `layer` 和 `element` 时，会把 `config` 合并到该地点配置中：

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

---

## 覆盖配置

如果需要完全替换原地点配置：

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

---

## 组合条件

```javascript
maplebirch.tool.patch.configureLocation(
  'mountain_pass',
  {
    condition: () => {
      const night = Time.hour < 6 || Time.hour >= 18;
      return Weather.name === 'snow' && night;
    }
  },
  {
    layer: 'base',
    element: 'snow_night'
  }
);
```

---

## 补充说明

- 多次配置同一个地点时，默认会合并配置。
- `overwrite: true` 会替换该地点的配置，适合完全重做地点图层。
- `layer` 和 `element` 适合只追加某个图层中的一个元素。
- `condition` 中建议只做判断，不要修改游戏状态。
