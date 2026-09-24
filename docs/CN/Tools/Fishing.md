# 钓鱼扩展

用于向原版 `setup.fishing.lootTables.fish` 注册鱼类、食物鱼饵，以及**现有钓点**的鱼类权重。抽取、小游戏、鱼饵扣除和捕获记录仍由原版处理。

> [!IMPORTANT]
> 此功能依赖目标 DoL 版本提供 `setup.fishing.lootTables.fish`。框架不会创建新钓点，也不会替模组提供鱼类图标。

## 使用入口

```javascript
maplebirch.tool.patch.fishing.add(key, config);
maplebirch.tool.patch.fishing.addBait(key, config);
maplebirch.tool.patch.fishing.configure(location, weights);
```

**`key`** 是鱼类或鱼饵的标识，建议带模组名前缀，避免覆盖原版或其它模组的条目。`add()` 和 `configure()` 返回是否接受配置，无效配置返回 `false`；`addBait()` 无返回值。

通常在启动脚本中注册，框架会在初始化时合并到 `setup`。读档只补齐缺失的食物库存；捕获记录仍由原版更新。

## 最小示例

下面注册一条新鱼及其偏好的鱼饵，并调整码头权重。示例假设模组已提供 `fish/my-mod-silverfish.png`：

```javascript
maplebirch.tool.patch.fishing.addBait('my_mod_grub', { name: 'river grub' });

maplebirch.tool.patch.fishing.add('my_mod_silverfish', {
  minSize: 10,
  maxSize: 35,
  locations: { fishingPier: 0.7 },
  preferredBait: 'my_mod_grub',
  icon: 'fish/my-mod-silverfish.png'
});

maplebirch.tool.patch.fishing.configure('fishingPier', { my_mod_silverfish: 1.2 });
```

## 配置字段

`add(key, config)` 的配置字段：

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

> [!TIP]
> 如果必须等原版 `setup` 可用后才能决定配置，可在 `maplebirch.tool.onInit()` 中注册，再依次调用 `maplebirch.tool.patch.fishing.apply()` 和 `maplebirch.tool.patch.foodstuff.apply()`。一般的静态配置不需要手动调用 `apply()`。

## 钓点配置

`locations`、`preferredLocation` 和 `configure()` 使用以下原版钓点：

```text
fishingBeach / fishingPier / fishingCoastPath / fishingForestLake / fishingMoor
```

`configure(location, weights)` 调整现有钓点中各鱼类的权重，`0` 表示该处不出现此鱼。鱼类键必须在应用配置时存在，否则报错。此接口只调整鱼类分布，钓点入口、发现条件和剧情由 Mod 提供。旧版本缺少 `setup.fishing` 时会跳过钓鱼配置。

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

## 相关文档

- [食物注册](Foodstuff.md)：鱼类对应的食物条目与鱼饵配置。
- [Patch 扩展](Patches.md)：注册与应用 DoL 数据补丁的规则。
- [boot.json 配置](../BootJson.md)：从文件导入鱼类、鱼饵与钓点权重。
- [文档导航](../README.md)：查找其它 DoL 内容扩展。
