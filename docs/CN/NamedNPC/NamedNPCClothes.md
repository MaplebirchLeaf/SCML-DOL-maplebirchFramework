# NPC 服装与衣柜

人物的互动衣服、画师图片和 PC 模型衣柜使用不同数据。先决定要改变哪一项，再使用对应入口。

## 三种配置的边界

| 入口                              | 改变什么                                              | 不会自动完成什么                                   |
| :-------------------------------- | :---------------------------------------------------- | :------------------------------------------------- |
| `maplebirch.npc.addClothes()`     | 原版 NPC 互动套装，如衣物名称、掀起／拉下动作和完整度 | 不生成 PC 模型衣物贴图                             |
| `params.npc.Sidebar.config`       | 画师模型的图片候选与显示条件                          | 不自动穿上原版互动套装，也不根据图片名推导衣物数据 |
| `maplebirch.npc.Clothes.wardrobe` | 用 PC 服装素材绘制的侧边栏衣柜                        | 不改写原版遭遇的互动衣服，不把人物加入当前场景     |

同一个 NPC 可以同时配置它们。若剧情要求互动文本和立绘同步，应在剧情与衣柜条件中使用同一份模组状态。单独注册其中一项不会同步其它项。

## 原版互动套装

在原版 `setup` 就绪后登记，例如放在 `tool.onInit()` 中：

```javascript
maplebirch.tool.onInit(() => {
  maplebirch.npc.addClothes({
    name: 'myMod:library',
    type: 'custom',
    gender: 'f',
    upper: {
      name: 'shirt',
      desc: '衬衫',
      word: 'a',
      action: 'lift',
      integrity_max: 100
    },
    lower: {
      name: 'trousers',
      desc: '长裤',
      word: 'n',
      action: 'pull',
      integrity_max: 100
    },
    desc: '衬衫和长裤'
  });
});

maplebirch.npc.add({
  nam: 'Luna',
  gender: 'f',
  adult: 1,
  teen: 0,
  outfits: ['myMod:library']
});
```

`outfits` 是可用套装名单，框架还会补入性别对应的默认套装。何时选择哪套衣服，仍由原版服装生成与场景逻辑决定。注册不会立刻给当前遭遇换衣。

| 字段                       | 含义与默认值                                               |
| :------------------------- | :--------------------------------------------------------- |
| `name`                     | 唯一套装标识，必填；重名会跳过并记录警告                   |
| `type`、`gender`、`outfit` | 原版选择套装使用的数据，默认 `'custom'`、`'n'`、`0`        |
| `upper`、`lower`           | 必填，可写名称字符串或部位对象；只写名称不表示 PC 衣物资源 |
| `upper/lower.name`         | 该部位的互动名称，必填                                     |
| `desc`                     | 套装或部位描述，省略时由名称生成                           |
| `word`                     | 原版英文冠词标记，默认上衣 `'a'`、下装 `'n'`               |
| `action`                   | 衣物动作，默认上衣 `'lift'`、下装 `'pull'`                 |
| `integrity_max`            | 最大完整度，默认 `100`                                     |

结果由框架加入 `setup.npcClothesSets`，不用在模组中重新赋值整个数组。`addClothes()` 可一次接收多个套装，没有返回值。

## PC 模型衣柜的最小接入

### 1. 提供衣柜模板

`data/npc/wardrobe.yaml`：

```yaml
'myMod:casual':
  upper:
    name: 't-shirt'
    variable: 'tshirt'
    colour: 'blue'
  lower:
    name: 'shorts'
    variable: 'shorts'
    colour: 'black'

'myMod:library':
  upper:
    name: 'school shirt'
    variable: 'schoolshirt'
    colour: 'white'
  lower:
    name: 'shorts'
    variable: 'shorts'
    colour: 'black'
```

这是基于原版 0.5.12.13 衣物的简短配置。`name` 与 `variable` 必须对应实际 PC 衣物，不能写 `school_shirt` 等自行猜测的名称。框架通过原版 `clothesIndex` 查询完整定义，再合入本次状态。使用自定义衣物时还要保证其定义与素材已由对应衣物模组提供。

颜色字段是 `colour`，不是 `color`。如需保留损坏、款式、配色等更多状态，可以从实际衣物数据复制完整对象。框架内置 `naked` 槽位模板，无需复制一大份裸体配置；其它套装需自行提供，建议用模组前缀避免重名。

### 2. 从 boot.json 导入

下面是 `maplebirchAddon` 的配置项：

```json
{
  "modName": "maplebirch",
  "addonName": "maplebirchAddon",
  "modVersion": ">=5.2.0",
  "params": {
    "npc": {
      "Sidebar": {
        "clothes": ["data/npc/wardrobe.yaml"]
      }
    }
  }
}
```

脚本中也可 `await wardrobe.load('myMod', 'data/npc/wardrobe.yaml')`。两项分别是实际模组名和 ZIP 内路径。加载失败会记录日志，因此需要核对文件路径与 `wardrobe.has(key)`，不能把 Promise 已结束当作模板一定存在。

### 3. 登记日程与穿着规则

```javascript
maplebirch.npc.addSchedule('Luna', schedule => {
  schedule.at(0, 'home').at(8, 'library').at(18, 'home');
});

maplebirch.once(':storyready', () => {
  const wardrobe = maplebirch.npc.Clothes.wardrobe;
  wardrobe.wear('Luna', '*', 'myMod:casual');
  wardrobe.wear('Luna', 'library', 'myMod:library');
});
```

等待 `:storyready` 登记穿着规则，是为了让上述衣柜文件先加载。`wear()` 会立即检查模板是否存在，过早登记一个不存在的模板会被跳过。日程中的 `library`、`home` 是本模组使用的地点标签。

这里的穿着地点取自 **露娜的框架日程**，不是玩家的 `V.location`。在框架设置中开启 NPC 侧边栏显示与“PC 模型模式”，并让露娜实际进入当前场景后，才能看到 PC 模型衣物。人物出现条件见[侧边栏](NamedNPCSidebar.md)。

## 选择规则与当前服装

`wardrobe.wear(npcName, location, choice, options?)`：

- `location` 可为地点字符串、地点数组或全局兜底 `'*'`。
- 先找当前日程地点的规则，再找全局规则。同一组中，后登记且条件成立的规则优先。
- `choice` 为模板键，或 `[模板键, 权重]` 数组。
- `options` 可为条件，也可为 `{ when, wetness }`。

```javascript
const wardrobe = maplebirch.npc.Clothes.wardrobe;
wardrobe.wear('Luna', 'library', [
  ['myMod:library', 8],
  ['myMod:casual', 2]
]);
```

这条加权规则会优先于前面登记的同地点普通规则。仅在规则变为当前有效规则时随机选择一次；连续读取 `worn()` 或原地重绘不会重复抽取。规则中断后再次触发才会重新选择。不存在的键、非有限或非正权重会被忽略并记录警告。

```javascript
const outfit = maplebirch.npc.Clothes.wardrobe.worn('Luna');
console.log(outfit.upper?.name);
```

无任何规则命中时，沿用本次运行中上一次选中的套装；从未选中过才使用 `naked`。`worn()` 返回本次组合的副本，不要通过修改它来保存换装。规则与当前选择保存在运行时，重新加载会重新登记；需要持久化的剧情服装状态由模组自己的存档变量管理。

## 条件使用的是谁的位置

先区分两个问题：“露娜按日程在哪里？”与“玩家现在在哪里？”衣柜会用到两者，但入口不同。

| 入口                             | 读取什么                               |
| :------------------------------- | :------------------------------------- |
| `wear()` 第二项地点              | 该 NPC 的 `Schedule.location`          |
| `modify()` 的 `context.location` | 该 NPC 的日程地点                      |
| `when()` 分组中的 `location`     | 玩家的 `V.location`                    |
| `when()` 分组中的 `passage`      | 当前 passage 标题                      |
| `when()` 分组中的 `hours`        | 当前 `V.time.hour`，两端包含，可跨午夜 |

### 写一个可复用的雨夜条件

继续使用前面已注册的露娜。假设场景用 `park` 表示公园，希望玩家在公园的雨夜见到她时，衣服显示为微湿：

```javascript
const wardrobe = maplebirch.npc.Clothes.wardrobe;

const rainyNight = wardrobe.when(
  // 给这条判断起名，供其它衣柜规则复用。
  'myMod:rainyNight',
  {
    // 检查玩家的 V.location。
    location: 'park',
    // 21～23 点与 0～5 点都成立，包含 05:59。
    hours: [21, 5]
  },
  // 地点、小时、下雨三项必须同时成立。
  () => Weather.precipitation === 'rain'
);

// 这里只登记规则；框架每次查询衣服时再检查当前状态。
wardrobe.wet('Luna', 'damp', rainyNight);
```

把 `park` 换成场景实际写入 `V.location` 的值。如果只想检查 passage 标题，则把 `location` 改成 `passage`。这条规则只决定湿度，人物是否在场仍由剧情负责。

### 其它规则怎样取到它

上面的 `when(名称, 分组, 额外条件)` 是**登记**。只传名称则是**取回**，不必再写一遍地点和时间：

```javascript
const sameRainyNight = maplebirch.npc.Clothes.wardrobe.when('myMod:rainyNight');

// 接在上一段脚本后执行：两者是同一个函数，不是此刻判断结果的快照。
console.log(sameRainyNight === rainyNight); // true
```

| 写法                                                    | 结果                         |
| :------------------------------------------------------ | :--------------------------- |
| `when('myMod:rainyNight')`                              | 取回已登记的判断函数         |
| `when('myMod:missing')`                                 | 未登记，抛错                 |
| 再次执行 `when('myMod:rainyNight', { hours: [20, 6] })` | 名称重复，抛错，不覆盖原条件 |

取回的函数可以继续传给 `wet()`、`layer()` 或 `wear()`，每次查询时都会读取最新状态。每个名称只登记一次，后续只传名称即可。

### 多个判断怎样组合

`wet()`、`layer()` 和 `wear()` 的条件还可以直接写成数组。下面是前面雨夜条件的**另一种写法**，用于说明条件格式，实际选一种登记即可：

```javascript
const wardrobe = maplebirch.npc.Clothes.wardrobe;

wardrobe.wet('Luna', 'damp', [
  // 布尔值：true 放行，false 会使整组不成立。
  true,
  // 表达式字符串：查询时读取当前玩家位置。
  "V.location === 'park'",
  // 同步函数：查询时检查天气。
  () => Weather.precipitation === 'rain',
  // “晚间或凌晨”写在这一项内部。
  () => Time.hour >= 21 || Time.hour <= 5
]);
```

数组要求**每一项都成立**；想表达“任一项成立”，在单个表达式或函数中使用 `||`。条件只做判断，扣款、发奖等写进实际行动分支。

JSON/YAML 中可以写布尔值、表达式字符串和条件数组。函数写在 JavaScript 脚本中，不要把 `() => ...` 当作 JSON/YAML 的字符串条件。

## 合并顺序与局部修改

组合顺序为：`naked` → `base`／`layer` → 选中的套装 → `modify` → 湿度。

同名槽位按**整件服装**替换，不是把两件衣服的字段深度合并。`base()` 设置的某个槽位可能被套装覆盖；需要最终调整时使用 `modify()`。

```javascript
maplebirch.once(':storyready', () => {
  const wardrobe = maplebirch.npc.Clothes.wardrobe;
  wardrobe.modify('Luna', clothes => {
    if (V.myMod?.lunaBorrowedShirt) {
      wardrobe.put(clothes, 'myMod:casual', 'upper');
    }
  });
});
```

| 方法                                           | 用途                                                |
| :--------------------------------------------- | :-------------------------------------------------- |
| `set(key, template)` / `get(key)` / `has(key)` | 登记、取得模板副本或检查存在；同键 `set()` 替换模板 |
| `base(name, callback)`                         | 套装合入前修改本次衣物                              |
| `layer(name, keyOrFunction, condition?)`       | 在基础阶段按条件合入模板                            |
| `modify(name, callback)`                       | 套装合入后修改；回调收到 `(clothes, context)`       |
| `put(clothes, key, slots?)`                    | 在回调中合入模板，可限制单个槽位或槽位数组          |
| `apply(clothes, slot, item)`                   | 复制一件衣物到指定槽位                              |
| `strip(clothes, slots)`                        | 把槽位恢复为 `naked` 占位，不删除槽位               |

渲染与条件回调可能反复执行，只修改本次传入的衣物副本。剧情扣款、消耗、奖励等放在实际行动结算中。

## 湿度

```javascript
maplebirch.once(':storyready', () => {
  const wardrobe = maplebirch.npc.Clothes.wardrobe;
  wardrobe.wear('Luna', 'lake', 'myMod:casual', {
    when: () => V.myMod?.lunaSwimming === true,
    wetness: 'soaked'
  });
  wardrobe.wet('Luna', 'soaked', () => V.myMod?.lunaJustFellInWater === true);
});
```

`dry / damp / wet / soaked` 分别对应透明度 `1 / 0.9 / 0.7 / 0.5`，只作用于 `upper`、`lower`、`under_upper`、`under_lower`。其它槽位不变。`wear` 的湿度属于穿着规则；`wet()` 临时覆盖当前套装的湿度，最后一条命中规则优先，无命中则回退到 `wear`。

`lunaSwimming` 和 `lunaJustFellInWater` 是模组自己的剧情状态。落水状态结束后由实际剧情清除，湿度便回退到当前穿着规则。不提供第三项条件的 `wet()` 会在所有地点覆盖湿度。

## 画师模型

`Sidebar.config` 的文件是图片组合配置，不是上面的衣柜模板。每个部位数组只选第一条满足条件的图片，默认图片放在最后。完整字段、路径与示例见 [NPC 侧边栏](NamedNPCSidebar.md#画师分层模型)。
