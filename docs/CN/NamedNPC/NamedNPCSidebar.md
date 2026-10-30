# NPC 侧边栏

侧边栏从当前场景的命名 NPC 名单中选择人物。注册人物、登记图片和让人物在场是三个步骤，详见 [NPC 注册](NamedNPC.md)。

## 先选择显示方式

| 方式         | 资源入口                                | 设置                                 |
| :----------- | :-------------------------------------- | :----------------------------------- |
| 整张静态立绘 | `img/ui/nnpc/<npc>/` 与 `Sidebar.image` | 关闭“PC 模型模式”，为该 NPC 选择图片 |
| 画师分层模型 | `Sidebar.config` 指向的图片配置文件     | 关闭“PC 模型模式”，选择该分层配置    |
| PC 模型      | 原版人物素材、NPC 外貌与侧边栏衣柜      | 开启“PC 模型模式”                    |

三种方式都需要开启“NPC 侧边栏图像显示”。PC 模型模式是显示方式开关，开启后不会再同时叠加选中的画师立绘。第二 NPC 模型和 NPC 桌宠沿用对应人物的显示资源。

## 最小静态立绘接入

### 1. 准备文件

```text
myMod/
  boot.json
  framework.js
  scenes.twee
  img/ui/nnpc/luna/default.png
  img/ui/nnpc/luna/happy.png
```

`framework.js` 注册 `nam: 'Luna'`，`scenes.twee` 在场景中使用 `<<npc "Luna">>`。这两部分的完整示例见[NPC 注册](NamedNPC.md)。图片文件需要实际放入模组 ZIP。

### 2. 声明资源

下面是 `addonPlugin` 数组内的框架配置项：

```json
{
  "modName": "maplebirch",
  "addonName": "maplebirchAddon",
  "modVersion": ">=5.2.0",
  "params": {
    "script": ["framework.js"],
    "npc": {
      "Sidebar": {
        "image": ["Luna"]
      }
    }
  }
}
```

`tweeFileList` 仍写在 `boot.json` 顶层，由 ModLoader 加载。`image` 中写人物名，不写 PNG 路径。框架扫描 `img/ui/nnpc/` 后，把文件名（不含扩展名）加入图形候选列表；`default.png` 与 `happy.png` 是两个可选项，不会根据文件名自动判断心情。

### 3. 在游戏中选择

1. 加载模组并进入露娜在场的场景。
2. 打开框架的 NPC 侧边栏设置，开启图像显示。
3. 关闭“PC 模型模式”，选择人物 `Luna` 的图形 `default` 或 `happy`。
4. 若关闭了图像显示，或图形仍是 `none`，登记图片也不会显示。

人物选择与图形选择是两件事。第一／第二人物候选来自当前 `V.npc` 与原版命名人物表的交集；图形资源可以提前登记。仅执行 `initnpc` 或给日程填写地点，不会把人物加入当前场景。场景结束后沿用原版 `endevent` 清理。

人物选择为“自动”时，第一模型使用当前名单最后一位人物，第二模型使用另一位最近加入的人物。手动选中的人物离开名单后会回到自动选择；第二模型还需单独开启。

## 图片路径与 DoLP 目录

支持的图片扩展名为 `png`、`jpg`、`jpeg`、`gif`、`webp`。

```text
img/ui/nnpc/luna/default.png
img/ui/nnpc/luna/female/pale/default.png
img/ui/nnpc/luna/male/dark/default.png
```

后两种为 DoLP 常用的深层目录。框架按当前人物性别选择 `male`／`female`，男性为 `male`，其它为 `female`；按侧栏肤色设置中的 `skin_type` 是否包含 `dark` 选择 `dark`／`pale`。

优先查找匹配性别与肤色的深层同名图片，再查平面目录，最后回退到其它可用的同名路径。`black_wolf`、`black-wolf`、`black wolf` 等目录会归一化到人物名。额外目录中的同名素材也可能作为回退候选，文件名应避免无意重复。

## 画师分层模型

`Sidebar.config` 接收 JSON/YAML 文件路径数组，每个文件可为单个配置对象或配置数组。以下为 `data/npc/luna.yaml`：

```yaml
- name: 'Luna'
  body: 'img/npc/luna/body.png'
  head:
    - img: 'img/npc/luna/hair_rain.png'
      zIndex: auto
      cond: "Weather.precipitation === 'rain'"
    - img: 'img/npc/luna/hair.png'
      zIndex: auto
  face:
    - img: 'img/npc/luna/face_happy.png'
      zIndex: auto
      cond: 'V.myMod?.lunaHappy === true'
    - img: 'img/npc/luna/face_default.png'
      zIndex: auto
  upper:
    - img: 'img/npc/luna/library_top.png'
      zIndex: auto
      cond: "maplebirch.npc.Schedule.get('Luna').location === 'library'"
    - img: 'img/npc/luna/casual_top.png'
      zIndex: auto
```

各图片均需由模组提供，`lunaHappy` 是模组自己的剧情状态。`library` 对应该人物日程中的标签。所有图层应按同一画布尺寸与坐标对齐；框架不会替作者生成或补齐素材。

在同一个框架配置项的 `params.npc.Sidebar` 中增加：

```json
{
  "npc": {
    "Sidebar": {
      "config": ["data/npc/luna.yaml"]
    }
  }
}
```

这里展示的是 `params` 内容，完整外层同前面的静态图片配置。

| 字段                                                              | 含义                                                       |
| :---------------------------------------------------------------- | :--------------------------------------------------------- |
| `name`                                                            | 对应命名 NPC 的名称，示例为 `Luna`                         |
| `body`                                                            | 基础图片路径字符串，不是候选数组                           |
| `head`、`face`、`neck`、`upper`、`lower`、`legs`、`feet`、`hands` | 部位候选数组；即使只有一张也写数组                         |
| 候选的 `img`                                                      | 必填图片路径，相对 ZIP 根目录                              |
| 候选的 `cond`                                                     | 省略表示成立；可写布尔值、表达式字符串或条件数组           |
| 候选的 `zIndex`                                                   | 默认 `'auto'`；数值表示画布绝对层级，不是相对该 NPC 的偏移 |

**同一部位只选第一条满足条件的候选，不会叠加全部候选。** 默认图必须放在有条件图片之后。需要头发和耳朵同时显示时，应在同一图片中合成，或通过专门的角色图层扩展；不能把它们依次放进 `head` 数组就当作两层。

### 把“同时满足”和“任选其一”写清楚

例如，希望下雨**或**下雪时使用湿发图片，露娜高兴**且**感情达到 `30` 时使用笑脸。可以把前面的 `luna.yaml` 改成：

```yaml
- name: 'Luna'
  body: 'img/npc/luna/body.png'
  head:
    - img: 'img/npc/luna/hair_rain.png'
      zIndex: auto
      # “下雨或下雪”写在同一个表达式中。
      cond: "Weather.precipitation === 'rain' || Weather.precipitation === 'snow'"
    - img: 'img/npc/luna/hair.png'
      zIndex: auto # 无条件候选放最后，作为默认头发。
  face:
    - img: 'img/npc/luna/face_happy.png'
      zIndex: auto
      cond:
        # 数组中的两项都成立，才会选中笑脸。
        - 'V.myMod?.lunaHappy === true'
        - '(C.npc.Luna?.love ?? 0) >= 30'
    - img: 'img/npc/luna/face_default.png'
      zIndex: auto # 不满足上面的条件时，使用普通表情。
```

`lunaHappy` 仍由实际剧情设置。配置只读取它，打开侧边栏不会增加感情或改变心情。

这里用数组表示“同时满足”，用表达式里的 `||` 表示“任选其一”，不需要 `$or` 对象。JSON/YAML 的字符串应当直接写判断表达式；需要 `() => ...` 函数时，改用脚本对象。

配置会生成供“图形选择”使用的内部键，例如单条 `myMod` 模组的 `luna.yaml` 为 `myMod_luna`。可用 `maplebirch.npc.Clothes.art.keys('Luna')` 查询，以实际返回值为准；无需硬编码存档中的图形选择。

## PC 模型与衣柜

PC 模型读取 NPC 当前外貌、框架转化与侧边栏衣柜，不使用画师模型的 PNG 候选。开启对应设置后无需提供静态立绘；衣服的实际素材仍须在游戏中存在。

| `Sidebar` 字段 | 加载什么            |
| :------------- | :------------------ |
| `image`        | 静态图片人物目录    |
| `config`       | 画师图片候选文件    |
| `clothes`      | PC 模型衣柜模板文件 |

衣柜文件是“模板键 → 衣物槽位对象”，不是上面的 `name/body/head` 格式。模板、日程与穿着规则需要一起接入，详见[NPC 服装与衣柜](NamedNPCClothes.md)。框架内置裸体占位模板，不需要在每个模组重复定义它。

### 发型长度

`hair_sides_length`（主体头发）与 `hair_fringe_length`（刘海）分别保存有限数字，默认各为 `200`。建议使用 `0` 至 `1000`，对应阶段如下：

| 长度起点 | 绘制阶段   |
| :------- | :--------- |
| `0`      | `short`    |
| `200`    | `shoulder` |
| `400`    | `chest`    |
| `600`    | `navel`    |
| `800`    | `thighs`   |
| `1000`   | `feet`     |

渲染按 `Math.trunc(长度 / 200)` 选阶段，落不到阶段表时回退 `short`。这不是自动把任意长度钳制到最大阶段。额外背发只使用主体长度。

```javascript
maplebirch.npc.add({
  nam: 'Luna',
  hair_side_type: 'default',
  hair_fringe_type: 'default',
  hair_sides_length: 800,
  hair_fringe_length: 200
});
```

以上为注册时补充初始外貌；剧情中改发型则修改当前 `C.npc.Luna`。发型字段使用原版资源标识。两个长度独立保存，缺失、非数字、非有限值各自恢复默认值，有效的 `0` 保留，不转换旧字段。

### 体液与滴落

PC 模型可显示原版体液与滴落素材。状态保存在 `V.maplebirch.npc.luna.fluids`，不改动玩家的 `V.player.bodyliquid`。每个部位为 `[goo, semen]` 二元组，各项限制在 `0` 至 `5`，没有 `nectar` 槽位。

在实际剧情结算中调用：

```javascript
const fluids = maplebirch.npc.fluids;

fluids.add('Luna', 'mouth', 2, 'semen'); // 在嘴部原有精液量上增加 2。
fluids.set('Luna', 'face', 1, 'goo'); // 把脸部黏液量设为 1，保留该部位的精液量。
fluids.reduce('Luna', 'mouth', 1, 'semen'); // 只减少嘴部的精液量。

const mouth = fluids.get('Luna').mouth;
const total = fluids.combined('Luna', 'mouth');
console.log({
  goo: mouth[0], // 二元组第一项。
  semen: mouth[1], // 二元组第二项，不能把整个 mouth 当成数字。
  total // 两项之和；渲染时才将显示量限制到 0～5。
});
```

`mouth[0]` 为爱液／黏液，`mouth[1]` 为精液，`combined()` 返回两项之和，不限制合计。渲染把合计限制到 `0` 至 `5`，不会改写保存值。`get()` 会补齐缺少的数据，不是纯粹的只读查询。

清理液体时，按需要选择清除范围：

```javascript
maplebirch.npc.fluids.clear('Luna', 'face', 'goo'); // 只清脸部黏液，保留精液。
maplebirch.npc.fluids.clear('Luna', 'face'); // 清脸部两种液体，保留其它部位。
maplebirch.npc.fluids.clear('Luna'); // 清除此 NPC 所有部位的两种液体。
```

`set/add/reduce` 省略类型时处理 `semen`；`clear` 省略类型清两项，省略部位清所有部位。合法部位是 `vagina`、`vaginaoutside`、`anus`、`mouth`、`penis`、`chest`、`face`、`hair`、`bottom`、`feet`、`leftarm`、`rightarm`、`neck`、`thigh`、`tummy`。

`penis`、`hair`、`bottom`、`vaginaoutside` 仅保存数据，没有对应的原版侧栏液体图层。框架每小时分别衰减两项，沿用原版滴落间隔和动画素材。旧数字值会转换为 `[旧值, 0]`，缺少部位补 `[0, 0]`。不要把整个二元组当作数字。

来源与增加时机由内容模组决定，框架不会自动检测剧情中的液体来源，两种液体也不使用不同的外观素材。

## 排查显示问题

| 现象                 | 检查顺序                                                        |
| :------------------- | :-------------------------------------------------------------- |
| 完全没有人物         | 人物已注册 → 当前场景执行 `npc` → 图像显示开启 → 模式正确       |
| 静态立绘不显示       | 文件在 ZIP 中 → 目录名与人物对应 → 图形不为 `none`              |
| 画师表情不切换       | 条件是否成立，默认候选是否提前拦截，部位是否写成数组            |
| 画师层被遮住         | 图片坐标一致，优先用自动层级；数值层级按整个画布比较            |
| PC 模型没有衣服      | 模板导入成功、衣物 `name/variable` 有效、日程地点与穿着规则一致 |
| 日程正确但人物未出现 | 日程不生成遭遇，需要内容模组提供在场场景                        |
| 只显示了一位人物     | 是否开启第二模型，两位人物是否都在当前名单中                    |
