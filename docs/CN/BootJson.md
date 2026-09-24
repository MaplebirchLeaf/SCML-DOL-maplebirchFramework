## boot.json 配置

### 适用场景

当模组需要使用 **`maplebirchFramework`** 的脚本加载、语言导入、音频导入、区域挂载或 NPC 资源注册时，可以在 **`boot.json`** 中配置 **`maplebirchAddon`**。

适合写在 **`boot.json`** 里的内容：

- 固定脚本文件：例如 `framework.js`、`npc.js`、`combat.js`
- 翻译文件：例如 `language/cn.yml`、`language/en.yml`
- 音频目录：例如 `audio`、`audio/bgm`
- 固定区域 widget：例如模组选项页、状态栏显示
- 基础 NPC 数据、NPC 状态、NPC 侧边栏资源

不建议写在 `boot.json` 里的内容：

- 需要复杂条件判断的逻辑
- 需要读取游戏状态后才决定的内容
- 大段 JavaScript 代码

这些内容应放入 **`script`** 加载的 JavaScript 文件中。

---

### 基本结构

```json
"addonPlugin": [
  {
    "modName": "maplebirch",
    "addonName": "maplebirchAddon",
    "modVersion": "^需要的框架版本",
    "params": {
      "script": ["framework.js"]
    }
  }
]
```

所有文件路径以模组压缩包内部路径为准。**`params`** 是配置主体，常用字段如下：

| 字段        | 说明                                                          |
| :---------- | :------------------------------------------------------------ |
| `script`    | 加载普通 JavaScript 脚本                                      |
| `module`    | 加载更早执行的模块脚本                                        |
| `language`  | 导入翻译文件                                                  |
| `audio`     | 导入音频目录                                                  |
| `framework` | 添加区域 widget，注册特质、小贴士、纹身、食物、古董或钓鱼数据 |
| `npc`       | 注册 NPC 相关资源                                             |

---

### script

**`script`** 是最常用的脚本加载字段。大多数模组功能都应放在这里。

```json
"script": ["framework.js"]
```

多个文件会按数组顺序加载：

```json
"script": [
  "framework.js",
  "modules/options.js",
  "modules/events.js",
  "modules/npc.js",
  "modules/combat.js"
]
```

适合在 `script` 中处理：

- 调用 `maplebirch.tool.addTo()` 添加区域 widget
- 注册时间、状态、天气事件
- 注册 NPC、NPC 状态、NPC 日程
- 注册战斗按钮
- 注册角色图层或转化
- 初始化模组自己的 `setup` 数据

---

### module

**`module`** 比 **`script`** 更早执行，适合需要参与框架模块扩展的脚本。

```json
"module": ["modules/register.js"]
```

多数模组不需要使用 **`module`**。如果只是注册 NPC、事件、战斗按钮或选项页，使用 **`script`** 即可。

---

### language

用于导入翻译文件。

默认写法：

```json
"language": ["CN", "EN"]
```

自定义文件路径：

```json
"language": {
  "CN": "language/cn.yml",
  "EN": "language/en.yml"
}
```

对象写法：

```json
"language": {
  "CN": {
    "file": "i18n/cn.yml"
  },
  "EN": {
    "file": "i18n/en.yml"
  }
}
```

同一语言分多个文件时，用数组并按希望的覆盖顺序排列；后面的文件覆盖前面的同名键：

```json
"language": {
  "CN": ["i18n/CN/common.yml", "i18n/CN/npc.yml"],
  "EN": ["i18n/EN/common.yml", "i18n/EN/npc.yml"]
}
```

对象写法中的 `file` 也接受数组。框架会先合并该语言的全部文件，再导入一次；指定文件缺失或无效时不会只导入其中一部分。默认的 `"language": ["CN", "EN"]` 会按 JSON、YML、YAML 顺序合并每种语言现有的默认文件。

脚本中使用：

```javascript
maplebirch.t('myMod.text.key');
maplebirch.auto('Known source text');
```

更多说明见 [翻译服务](Translator.md)。

---

### audio

用于导入模组内的音频目录。

```json
"audio": ["audio"]
```

多个目录：

```json
"audio": ["audio/bgm", "audio/se"]
```

脚本中播放：

```javascript
await maplebirch.audio.playFromMod('你的模组名', 'trackName');
```

更多说明见 [音频管理](Audio.md)。

---

### framework：添加区域 widget

用于把 widget 添加到框架支持的页面区域。

```json
"framework": {
  "addto": "Options",
  "widget": "MyModOptions"
}
```

等价于：

```javascript
maplebirch.tool.addTo('Options', 'MyModOptions');
```

多个区域：

```json
"framework": [
  {
    "addto": "Options",
    "widget": "MyModOptions"
  },
  {
    "addto": "StatusBar",
    "widget": "MyModStatus"
  }
]
```

带显示条件：

```json
"framework": {
  "addto": "StatusBar",
  "widget": {
    "widget": "CombatStatus",
    "passage": ["Combat", "Struggle"],
    "exclude": ["Victory"]
  }
}
```

更多区域名称和 widget 配置见 [区域管理系统](ToolCollection/Framework.md)。

---

### framework：注册特质

用于添加自定义特质。

```json
"framework": {
  "traits": [
    {
      "title": "my_trait",
      "name": "My Trait",
      "colour": "gold",
      "has": "V.myMod?.trait === true",
      "text": "Trait description"
    }
  ]
}
```

| 字段     | 说明           |
| :------- | :------------- |
| `title`  | 特质标识       |
| `name`   | 显示名称       |
| `colour` | 显示颜色       |
| `has`    | 是否拥有该特质 |
| `text`   | 特质说明       |

`has` 可以写布尔值，也可以写判断表达式。表达式会作为代码执行，只应写可信内容。

更多说明见 [特质注册](ToolCollection/Traits.md)。

---

### framework：注册数据文件

**`framework`** 支持把常见数据直接写在 **`boot.json`**，也支持引用模组压缩包内的 **`.json`**、**`.yaml`** 或 **`.yml`** 文件。

```json
"framework": [
  {
    "traits": "data/traits.yaml"
  },
  {
    "tips": "data/tips.json"
  },
  {
    "bodywriting": "data/bodywriting.yaml"
  },
  {
    "foodstuff": "data/foodstuff.yaml"
  },
  {
    "antiques": "data/antiques.yaml"
  },
  {
    "fish": "data/fish.json",
    "bait": "data/bait.yaml",
    "fishingLocations": "data/fishing-locations.yaml"
  }
]
```

同一个 **`framework`** 对象可以声明多个数据字段。每个字段都支持文件路径或路径数组；多个文件按顺序读取，内容使用下表中的格式：

| 字段                                                   | 内容格式                                      |
| :----------------------------------------------------- | :-------------------------------------------- |
| `traits`                                               | 特质配置数组                                  |
| `tips`                                                 | 提示文本数组，或分类到文本数组的对象          |
| `bodywriting`、`foodstuff`、`antiques`、`fish`、`bait` | 以唯一标识为键的对象，或每项包含 `key` 的数组 |
| `fishingLocations`                                     | 钓点到鱼类权重的对象                          |

这些内容也可以直接内联。按键注册的数据重复时，以后注册的配置为准；`fish`、`bait` 和 `fishingLocations` 对应原版 0.5.12.13 的钓鱼系统。

`tips.json` 可以直接写字符串数组，默认加入原版始终启用的 `general` 分类：

```json
["第一条模组小贴士。", "小贴士支持原版使用的 HTML 与 SugarCube 标记。"]
```

需要跟随原版内容开关时，也可以按 `setup.tips` 的分类对象来写：

```json
{
  "general": ["始终可能出现的小贴士。"],
  "weather": ["启用天气内容时出现的小贴士。"],
  "myMod": ["自定义分类也会自动加入随机池。"]
}
```

原版分类继续遵循原版内容开关；新增分类默认始终启用，并会自动加入原版 `generateTipsList` 生成的随机池。脚本中也可以调用 `maplebirch.tool.patch.tips.add('myMod', '新的小贴士')`；框架会在原版 `init_tips` 之后合并内容，并自动去除重复文本。

内联的 `tips` 字符串数组用于提示文本；当所有项均以 `.json`、`.yaml` 或 `.yml` 结尾时，按文件路径读取。

相关文档：

- [Patch 注册](ToolCollection/Patches.md)
- [特质注册](ToolCollection/Traits.md)
- [小贴士注册](ToolCollection/Tips.md)
- [身体文字](ToolCollection/Bodywriting.md)
- [食物注册](ToolCollection/Foodstuff.md)
- [钓鱼扩展](ToolCollection/Fishing.md)
- [古董注册](ToolCollection/Antiques.md)

---

### npc

用于注册 NPC 相关资源。

```json
"npc": {
  "NamedNPC": [],
  "Stats": {},
  "Transformation": {},
  "Pregnancy": {},
  "Sidebar": {
    "image": [],
    "clothes": [],
    "config": []
  }
}
```

| 字段              | 说明                          |
| :---------------- | :---------------------------- |
| `NamedNPC`        | 注册命名 NPC                  |
| `Stats`           | 注册 NPC 状态                 |
| `Transformation`  | 按 NPC 名称注册独立的转化配置 |
| `Pregnancy`       | 按 NPC 名称注册怀孕与周期配置 |
| `Sidebar.image`   | 导入 NPC 静态侧边栏图片       |
| `Sidebar.clothes` | 导入 NPC 衣柜配置             |
| `Sidebar.config`  | 导入 NPC 侧边栏模型资源配置   |

示例：

```json
"npc": {
  "NamedNPC": [
    [
      {
        "nam": "Example",
        "name": "Example",
        "title": "example"
      },
      {},
      {}
    ]
  ],
  "Stats": {
    "example_trust": {
      "min": 0,
      "max": 100,
      "default": 0,
      "position": 1
    }
  },
  "Transformation": {
    "Example": {
      "wolf": {
        "parts": { "wolf_ears": { "level": 1 }, "wolf_tail": { "level": 2 } }
      }
    }
  },
  "Pregnancy": {
    "Example": {
      "canBePregnant": true,
      "canImpregnatePlayer": true,
      "cycle": { "days": [26, 30], "dangerousDay": 14, "fertileLeadDays": [4, 6] }
    }
  },
  "Sidebar": {
    "image": ["img/npc/example.png"],
    "clothes": ["npc/clothes.yml"],
    "config": ["npc/sidebar.yml"]
  }
}
```

相关说明：

- [NPC 注册](NamedNPC/NamedNPC.md)
- [NPC 转化](NamedNPC/NamedNPCTransformation.md)
- [NPC 怀孕](NamedNPC/NamedNPCPregnancy.md)
- [NPC 状态](NamedNPC/NamedNPCStats.md)
- [NPC 服装](NamedNPC/NamedNPCClothes.md)
- [NPC 侧边栏](NamedNPC/NamedNPCSidebar.md)

---

### 完整示例

```json
"addonPlugin": [
  {
    "modName": "maplebirch",
    "addonName": "maplebirchAddon",
    "modVersion": "^需要的框架版本",
    "params": {
      "language": {
        "CN": "language/cn.yml",
        "EN": "language/en.yml"
      },
      "audio": ["audio"],
      "framework": [
        {
          "addto": "Options",
          "widget": "MyModOptions"
        },
        {
          "addto": "StatusBar",
          "widget": {
            "widget": "MyModStatus",
            "exclude": ["Start"]
          }
        }
      ],
      "npc": {
        "NamedNPC": [],
        "Stats": {},
        "Sidebar": {
          "image": [],
          "clothes": [],
          "config": []
        }
      },
      "script": [
        "framework.js",
        "modules/events.js",
        "modules/combat.js"
      ]
    }
  }
]
```
