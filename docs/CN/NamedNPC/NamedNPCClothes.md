# NPC 服装与衣柜

### 基本介绍

NPC 服装系统分为三个独立但相关的子系统，分别处理不同场景下的服装需求：

1. **原版 NPC 服装** (`addClothes`) - 游戏内互动服装
2. **NPC 侧边栏默认服装** (`Sidebar.config`) - NPC 侧边栏显示
3. **NPC 衣柜系统** (`Wardrobe`) - 基于位置和条件的服装切换

_可通过 `maplebirch.npc.addClothes` 来注册原版 NPC 服装。_

---

### 原版 NPC 服装系统 (VanillaClothes)

#### 用途

处理游戏内的服装互动，如脱衣、检查、损坏等。这些服装会在 NPC 对话、事件和互动中使用。

#### 使用方法

```javascript
// 添加原版NPC服装套装
maplebirch.npc.addClothes({
  name: 'school_uniform',
  type: 'uniform',
  gender: 'f',
  upper: {
    name: 'school_shirt',
    word: 'a',
    action: 'lift',
    integrity_max: 100
  },
  lower: {
    name: 'pleated_skirt',
    word: 'a',
    action: 'lift',
    integrity_max: 100
  },
  desc: '标准校服，白色衬衫和格子短裙'
});
```

#### 存储位置

```javascript
// 存储在 setup.npcClothesSets 数组中
setup.npcClothesSets = [
  {
    name: 'school_uniform',
    type: 'uniform',
    gender: 'f',
    outfit: 0,
    clothes: {
      upper: { name: 'school_shirt', ... },
      lower: { name: 'pleated_skirt', ... }
    },
    desc: '标准校服...'
  },
  // ... 其他服装
];
```

### 2. NPC 侧边栏默认服装 (Sidebar.config)

#### 用途

定义 NPC 在侧边栏显示时的外观。包括身体、头、脸、颈部、上半身、下半身、腿、脚、手等图层的配置。

#### 配置格式

支持 JSON 和 YAML 格式：

```yaml
# 侧边栏服装配置 (YAML)
- name: 'Luna' # NPC名称
  body: 'img/npc/luna/body.png' # 身体基础图片

  # 头部图层(可多个，按顺序渲染)
  head:
    - { img: 'img/npc/luna/hair_back.png', zIndex: 5 }
    - { img: 'img/npc/luna/face_base.png', zIndex: 10 }
    - {
        img: 'img/npc/luna/hat.png',
        zIndex: 20,
        cond: "V.weather === 'rain' || V.weather === 'snow'" # 条件显示
      }

  # 上半身服装图层
  upper:
    - { img: 'img/npc/luna/top_casual.png', zIndex: 15, cond: "C.npc.Luna.worn.upper.name === 'casual_top'" }
    - { img: 'img/npc/luna/top_formal.png', zIndex: 15, cond: "C.npc.Luna.worn.upper.name === 'formal_top'" }

  # 下半身服装图层
  lower:
    - { img: 'img/npc/luna/skirt.png', zIndex: 10 }

  # 手部图层
  hands:
    - { img: 'img/npc/luna/gloves.png', zIndex: 25, cond: ['C.npc.Luna.worn.hands', 'V.temperature < 10'] }
```

#### 在 boot.json 中配置

```json
{
  "modName": "fantasyMod",
  "addonName": "fantasyAddon",
  "modVersion": "^需要的框架版本",
  "params": {
    "npc": {
      "Sidebar": {
        "config": ["data/npc/luna_sidebar.yaml", "data/npc/draven_sidebar.json"]
      }
    }
  }
}
```

#### 条件系统

```yaml
# 条件类型示例：
- img: "path/to/image.png"
  # 布尔值 - 始终显示
  cond: true
  # 字符串表达式 - 游戏变量判断
  cond: "V.time.hour >= 18"
  # 数组 - AND 条件(全部为true时显示)
  cond: ["C.npc.Luna.mood === 'happy'", "V.weather === 'sunny'"]
  # 函数 - 动态判断
  cond: () => C.npc.Luna.magic_affinity >= 50
  # 复杂条件组合
  cond: [
    () => C.npc.Luna.worn.upper.name === 'robe',
    "V.season === 'winter'",
    {
      $or: [
        "V.location === 'library'",
        "V.location === 'tower'"
      ]
    }
  ]
```

---

### 3. NPC 衣柜系统 (Wardrobe)

#### 用途

根据 NPC 所在位置、时间、事件等条件，动态切换 NPC 的服装。用于模拟 NPC 的日常换装行为。

#### 基本概念

- **服装定义**: 定义一套完整的服装
- **位置注册**: 在特定位置穿着特定服装
- **条件控制**: 满足条件时才穿着
- **服装选择**: 位置特定 > 全局默认
- **服装延留**: 服装持续保留，直到另一条有效穿着规则触发
- **合并顺序**: 裸体模板 → NPC 基础层 → 选中的地点服装 → 动态修改 → 整套湿度

#### 服装定义文件 (来源于PC身上的服装数据)

```yaml
# wardrobe.yaml
naked:
  upper: { name: 'naked' }
  lower: { name: 'naked' }
  head: { name: 'naked' }
  hands: { name: 'naked' }
  feet: { name: 'naked' }

casual_outfit:
  upper: { name: 't-shirt', color: 'blue' }
  lower: { name: 'jeans', color: 'black' }
  head: { name: 'baseball_cap' }

school_uniform:
  upper: { name: 'school_shirt' }
  lower: { name: 'pleated_skirt' }
  head: { name: 'ribbon' }

work_uniform:
  upper: { name: 'apron' }
  lower: { name: 'work_pants' }
  head: { name: 'hairnet' }
```

#### 在 boot.json 中配置

```json
{
  "modName": "fantasyMod",
  "addonName": "fantasyAddon",
  "modVersion": "^需要的框架版本",
  "params": {
    "npc": {
      "Sidebar": {
        "clothes": ["wardrobe.yaml", "wardrobe.json"]
      }
    }
  }
}
```

#### 在代码中使用

框架内置衣柜会自动加载。通过代码加载额外衣柜文件时，需要同时传入模组名和文件路径。

```javascript
const wardrobe = maplebirch.npc.Clothes.wardrobe;

// 1. 加载衣柜配置
await wardrobe.load('myMod', 'data/wardrobe.yaml');

// 2. 设置 NPC 的基础服装；地点服装可覆盖同名部位
wardrobe.base('Luna', clothes => {
  clothes.neck = { name: 'collar' };
});

// 3. 为 NPC 注册服装
// 在学校位置总是穿校服
wardrobe.wear('Luna', 'school', 'school_uniform');

// 在咖啡馆位置穿便服，但只在非工作时间
wardrobe.wear('Luna', 'cafe', 'casual_outfit', () => V.time.hour >= 18 || V.time.hour <= 8);

// 每次重新触发规则时，按权重随机选择一套服装
wardrobe.wear('Luna', 'school', [
  ['school_uniform', 8],
  ['school_uniform_alt', 2]
]);

// 湿度属于本次穿着规则，而不是服装模板；整套服装统一使用字符串状态
wardrobe.wear('Luna', 'lake', 'school_uniform', {
  when: () => V.lunaSwimming,
  wetness: 'soaked'
});

// 需要动态变化时返回 dry、damp、wet 或 soaked
wardrobe.wear('Luna', 'park', 'casual_outfit', {
  wetness: () => (V.weather === 'rain' ? 'wet' : 'dry')
});

// 场景湿度覆盖当前已经选中的整套服装；条件不成立时退回 wear 的湿度
wardrobe.wet('Luna', 'soaked', () => passage() === 'Lake Soak');

// 条件基础层，可动态决定使用哪个已注册模板
wardrobe.layer(
  'Luna',
  () => (C.npc.Luna.pronoun === 'm' ? 'male_underwear' : 'female_underwear'),
  () => C.npc.Luna.corruption < 10
);

// 在动态修改中合并模板，或将槽位恢复为裸体占位
wardrobe.modify('Luna', clothes => {
  wardrobe.put(clothes, 'chastity_belt');
  wardrobe.strip(clothes, ['upper', 'lower']);
});

// 在面包店工作位置穿工作服
wardrobe.wear('Luna', 'bakery', 'work_uniform');

// 全局默认(当没有其他匹配时)
wardrobe.wear('Luna', '*', 'casual_outfit');

// 4. 最终动态修改；在地点服装合并后执行
wardrobe.modify('Luna', (clothes, context) => {
  if (context.location === 'park' && V.weather === 'rain') clothes.head = { name: 'hood' };
});

// 5. 获取当前服装
const currentOutfit = wardrobe.worn('Luna');
console.log('Luna当前穿着:', currentOutfit);
```

NPC 服装湿度使用 `dry`（干燥）、`damp`（湿润）、`wet`（潮湿）、`soaked`（湿透）四种语义状态，框架内部对应透明度 `1`、`0.9`、`0.7`、`0.5`。湿度统一作用于 `upper`、`lower`、`under_upper`、`under_lower`，不会使眼镜、首饰或鞋等槽位透明。未配置 `wetness` 时保持原有干燥显示。`wardrobe.wet()` 用于覆盖当前已选服装的湿度；存在多条匹配规则时最后注册的规则优先，未命中时退回 `wardrobe.wear()` 的湿度。

`wardrobe.layer()` 在地点服装之前按条件合并基础模板，适合内衣或固定配饰；模板键也可以由函数动态返回。`wardrobe.put(clothes, key, slots?)` 在回调中合并已注册模板，可用单个槽位或槽位数组限制合并范围。`wardrobe.apply(clothes, slot, item)` 将一件服装复制到指定槽位。`wardrobe.strip()` 会把指定槽位恢复为 `naked` 模板中的占位数据，不会留下渲染器无法读取的空槽位。地点服装在基础层之后合并，因此泳装等模板自身的 `under_upper`、`under_lower` 不受基础内衣条件影响。

`wardrobe.wear()` 只在当前位置存在有效规则时换装。当前位置没有匹配规则或规则条件不成立时，NPC 会延续上一次成功选中的服装；尚未触发过任何规则时才使用 `naked`。

重复使用的条件可命名组合。`location` 检查 `V.location`，`passage` 检查当前 passage 标题；`hours: [起始, 结束]` 使用 `V.time.hour`，允许跨午夜。第三个参数可补充原版剧情状态等条件。条件会在使用时重新求值，按名称再次调用 `when()` 可取得同一个函数：

```javascript
const nightStudy = wardrobe.when(
  'night-study',
  {
    location: ['library', 'school'],
    passage: 'Study',
    hours: [21, 5]
  },
  () => V.weather === 'rain'
);
wardrobe.wear('Luna', 'library', 'school_uniform', { when: nightStudy });
wardrobe.wet('Luna', 'damp', wardrobe.when('night-study'));
```

第三个参数也可以使用 `[服装键, 权重]` 数组。随机选择只在规则由未触发变为触发时执行一次；连续读取和服装延留期间不会重复随机，规则中断后再次触发时才会重新选择。不存在的服装键、非有限数或小于等于零的权重会被忽略并记录警告。

#### 服装层级示例

```javascript
// 假设 Luna 在 "school" 位置
// 系统会按以下顺序查找：

1. 位置特定: 'school' -> 'school_uniform'  (使用)
2. 全局默认: '*' -> 'casual_outfit'        (跳过)

// 假设 Luna 在 "park" 位置
1. 位置特定: 'park' -> 无
2. 全局默认: '*' -> 'casual_outfit'        (使用)
```
