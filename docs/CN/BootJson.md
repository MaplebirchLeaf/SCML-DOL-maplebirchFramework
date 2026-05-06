## boot.json 配置

### 适用场景

当模组需要使用 `maplebirchFramework` 的脚本加载、语言导入、音频导入、区域挂载或 NPC 资源注册时，可以在 `boot.json` 中配置 `maplebirchAddon`。

适合写在 `boot.json` 里的内容：

- 固定脚本文件：例如 `framework.js`、`npc.js`、`combat.js`
- 翻译文件：例如 `language/cn.yml`、`language/en.yml`
- 音频目录：例如 `audio`、`audio/bgm`
- 固定区域 widget：例如模组选项页、状态栏显示
- 基础 NPC 数据、NPC 状态、NPC 侧边栏资源

不建议写在 `boot.json` 里的内容：

- 需要复杂条件判断的逻辑
- 需要读取游戏状态后才决定的内容
- 大段 JavaScript 代码

这些内容应放入 `script` 加载的 JavaScript 文件中。

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

`params` 是配置主体。常用字段如下：

| 字段 | 说明 |
| :--- | :--- |
| `script` | 加载普通 JavaScript 脚本 |
| `module` | 加载更早执行的模块脚本 |
| `language` | 导入翻译文件 |
| `audio` | 导入音频目录 |
| `framework` | 添加区域 widget 或注册特质 |
| `npc` | 注册 NPC 相关资源 |

---

### script

`script` 是最常用的脚本加载字段。大多数模组功能都应放在这里。

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

`module` 比 `script` 更早执行，适合需要参与框架模块扩展的脚本。

```json
"module": ["modules/register.js"]
```

多数模组不需要使用 `module`。如果只是注册 NPC、事件、战斗按钮或选项页，使用 `script` 即可。

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

脚本中使用：

```javascript
maplebirch.t('myMod.text.key');
maplebirch.auto('Known source text');
```

更多说明见 [语言管理](LanguageManager.md)。

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

| 字段 | 说明 |
| :--- | :--- |
| `title` | 特质标识 |
| `name` | 显示名称 |
| `colour` | 显示颜色 |
| `has` | 是否拥有该特质 |
| `text` | 特质说明 |

`has` 可以写布尔值，也可以写判断表达式。表达式会作为代码执行，只应写可信内容。

更多说明见 [特质注册](ToolCollection/Traits.md)。

---

### npc

用于注册 NPC 相关资源。

```json
"npc": {
  "NamedNPC": [],
  "Stats": {},
  "Sidebar": {
    "image": [],
    "clothes": [],
    "config": []
  }
}
```

| 字段 | 说明 |
| :--- | :--- |
| `NamedNPC` | 注册命名 NPC |
| `Stats` | 注册 NPC 状态 |
| `Sidebar.image` | 导入 NPC 静态侧边栏图片 |
| `Sidebar.clothes` | 导入 NPC 衣柜配置 |
| `Sidebar.config` | 导入 NPC 侧边栏模型资源配置 |

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
  "Sidebar": {
    "image": ["img/npc/example.png"],
    "clothes": ["npc/clothes.yml"],
    "config": ["npc/sidebar.yml"]
  }
}
```

相关说明：

- [NPC 注册](NamedNPC/NamedNPC.md)
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

---

### 补充说明

- 文件路径以模组压缩包内部路径为准。
- `script` 文件按数组顺序执行。
- `module` 不是普通脚本入口，不确定时使用 `script`。
- `framework` 可以是单个对象，也可以是对象数组。
- `npc.NamedNPC` 的每一项是 `[npcData, npcConfig, translations]`。
- 配置能表达的内容有限，复杂逻辑应写入 JavaScript。
