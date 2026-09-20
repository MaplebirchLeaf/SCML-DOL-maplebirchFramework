# 钓鱼扩展

对应原版 0.5.12.13 的 `setup.fishing.lootTables.fish`。框架注册鱼类、食物鱼饵和现有钓点的鱼类权重，继续使用原版抽取、小游戏、鱼饵扣除和捕获记录。

## 使用入口

```javascript
maplebirch.tool.patch.addFish(key, config);
maplebirch.tool.patch.addBait(key, config);
maplebirch.tool.patch.configureFishingLocation(location, weights);
```

**`key`** 是鱼类或鱼饵的唯一标识，建议带模组名前缀。`addFish()` 和 `configureFishingLocation()` 返回是否接受配置，无效配置返回 `false`；`addBait()` 无返回值。

在启动脚本中注册，由框架统一合并到 `setup`。读档只补齐食物库存，捕获记录仍由原版 `updateFishRecord()` 更新。需要读取原版 `setup` 后再配置时，使用 `onInit`，注册后依次调用 `applyFishing()` 和 `applyFoodstuff()`。

## 最小示例

下面用原版已有的鲑鱼配置演示扩展，不引入新的图片资源：

```javascript
maplebirch.tool.patch.addFish('salmon', {
  minSize: 45,
  maxSize: 120,
  preferredSeason: ['autumn'],
  preferredLocation: ['fishingCoastPath'],
  preferredBait: 'wild_carrot',
  locations: { fishingPier: 0.75, fishingCoastPath: 1, fishingForestLake: 0.5 },
  cookable: true,
  minigame: { behavior: 'panicked', maxStamina: 5, armFatigueDifficulty: 2000 },
  icon: 'fish/salmon.png'
});

maplebirch.tool.patch.addBait('apple', { name: 'apple' });
maplebirch.tool.patch.configureFishingLocation('fishingPier', { salmon: 1.25 });
```

## 配置字段

`addFish(key, config)` 的配置字段：

| 字段                | 说明                                             | 默认值      |
| :------------------ | :----------------------------------------------- | :---------- |
| `minSize`           | 最小尺寸，有限正数                               | 必填        |
| `maxSize`           | 最大尺寸，不小于 `minSize`                       | 必填        |
| `locations`         | 钓点到非负权重的映射，至少有一项大于零           | 必填        |
| `icon`              | 鱼类图标路径，如 `fish/salmon.png`               | 必填        |
| `preferredSeason`   | `spring`、`summer`、`autumn`、`winter` 数组      | `[]`        |
| `preferredLocation` | 偏好钓点数组                                     | `[]`        |
| `preferredBait`     | `foodstuff` 键                                   | `bait_worm` |
| `cookable`          | 是否可烹饪                                       | `false`     |
| `isBaitFish`        | 标记饵鱼，同时为对应食物设置鱼饵标记             | -           |
| `requiresBaitFish`  | 需要饵鱼；为 `true` 时必须提供小游戏配置         | -           |
| `minigame`          | `behavior`、`maxStamina`、`armFatigueDifficulty` | -           |
| `foodstuff`         | 同键食物配置，见 [食物注册](Foodstuff.md)        | -           |

`behavior` 支持原版的 `runner`、`darter`、`panicked`、`anchor`、`thrasher`、`slipper`。尺寸与小游戏数值必须为有限正数，钓点权重必须为有限非负数。

每条注册鱼自动关联同键食物目录，供原版捕获入库使用。图片由 Mod 提供，食物图标默认从 `icon` 去掉 `fish/` 前缀，也可通过 `foodstuff.icon` 指定。

`addBait(key, config)` 接受 [食物配置](Foodstuff.md#常用字段)，自动设置原版 `is_fishing_bait` 标记并共用食物库存。自定义鱼饵使用原版普通食物鱼饵逻辑；原版 `baitfish` 和 `bait_worm` 保留各自的特殊处理。

## 钓点配置

`locations`、`preferredLocation` 和 `configureFishingLocation()` 使用以下原版钓点：

```text
fishingBeach / fishingPier / fishingCoastPath / fishingForestLake / fishingMoor
```

`configureFishingLocation(location, weights)` 调整现有钓点中各鱼类的权重，`0` 表示该处不出现此鱼。鱼类键必须在应用配置时存在，否则报错。此接口只调整鱼类分布，钓点入口、发现条件和剧情由 Mod 提供。旧版本缺少 `setup.fishing` 时会跳过钓鱼配置。

## boot.json

```json
{
  "framework": {
    "fish": "data/fish.json",
    "bait": "data/bait.yaml",
    "fishingLocations": { "fishingPier": { "salmon": 1.25 } }
  }
}
```

`fish`、`bait` 支持键值对象或带 `key` 的数组；`fishingLocations` 使用钓点到鱼类权重的对象。文件写法和完整 addon 结构见 [boot.json 配置](../BootJson.md)。
