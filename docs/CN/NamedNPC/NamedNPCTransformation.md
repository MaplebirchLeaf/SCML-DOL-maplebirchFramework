# NPC 转化

通过 `maplebirch.npc.Transformation` 注册命名 NPC 的转化、成长阶段和侧栏部位。转化状态独立保存在 `V.maplebirch.npc[name.toLowerCase()].transformation`，不会改写 PC 的转化。

## 接入顺序与职责

1. 先通过 [NPC 注册](NamedNPC.md)登记人物，例如 `nam: 'Luna'`。
2. 在模组加载脚本中登记转化定义。它描述门槛与外观，不会自动增加成长值。
3. 在真正完成转化行动的分支调用 `build()` 或 `set()`。成长来源、时间推进和剧情条件由内容模组实现。
4. 在侧边栏开启 PC 模型模式，并让该 NPC 在当前场景中出现，才能看到原版部位图层。静态立绘与画师图片不会自动随转化生成新素材。

本页的 `parts` 是 NPC 渲染部位，不等同于 PC 转化系统的 `parts` 数组。不要把 `maplebirch.char.transformation` 的配置直接放到此接口。

## 注册转化

```javascript
maplebirch.npc.Transformation.add('Luna', 'wolf', {
  levels: [5, 10, 15, 20, 25, 30],
  type: 'wolfgirl',
  parts: {
    wolf_ears: {
      level: 1
    },
    wolf_tail: {
      level: 2
    },
    wolf_cheeks: {
      level: 3,
      style: 'feral'
    },
    wolf_pits: {
      level: 4
    },
    wolf_pubes: {
      level: 4
    }
  },
  sidebar(nnpc) {
    nnpc.wolf_tail_layer = 'back';
  }
});
```

第一个参数是 NPC 的 `nam`，第二个参数是只属于该 NPC 的转化 ID。不同 NPC 可以分别注册同名的 `wolf`，彼此不会覆盖。注册本身不会给 NPC 增加转化。

同一 NPC、同一转化 ID 再次 `add()` 会替换该定义，不是逐字段追加。定义属于运行时，存档保存的是成长状态。

| 配置                             | 说明                                                                     |
| :------------------------------- | :----------------------------------------------------------------------- |
| `levels`                         | 各等级的累计成长值，必须为递增的正数。默认 `[5, 10, 15, 20, 25, 30]`     |
| `max`                            | 成长值上限，不低于最后一级阈值；省略时使用最后一级阈值                   |
| `type`                           | `Transformation.type(name)` 返回的玩法身份，不改写 NPC 基础数据的 `type` |
| `parts`                          | 按等级启用原版转化部位，主、副 NPC 模型均支持                            |
| `body(bodydata, state, npcName)` | 修改本次渲染的身体数据副本，例如 `hairColour`、`eyeColour`               |
| `sidebar(nnpc, state, npcName)`  | 部位配置应用后执行，用于调整位置、姿态或样式                             |
| `layers`                         | 通过角色图层接口向 `main` 模型注册自定义图层                             |

`body` 和 `sidebar` 的 `state` 提供只读的 `build`、`level`。`sidebar` 接收正在组装的渲染对象，此时服装、身体滤镜和遮罩尚未全部生成。

`bodydata` 是顶层副本，适合直接替换发色、眼色等字段；其中的嵌套对象不保证独立。需要调整嵌套内容时先复制该字段再替换，避免原位修改 NPC 的存档数据。

渲染回调可能反复执行，只修改本次传入的副本，不在里面增加成长、扣除资源或更新剧情进度。`layers` 是挂到 `main` 的自定义图层，需要作者自己限制目标 NPC 与显示条件；原版 `parts` 的主、副人物处理由框架完成。

## 原版部位

`parts` 的键由转化名称和部位组成：

| 转化   | 支持的键                                                                           |
| :----- | :--------------------------------------------------------------------------------- |
| 天使   | `angel_halo`、`angel_wings`                                                        |
| 堕天使 | `fallen_halo`、`fallen_wings`                                                      |
| 恶魔   | `demon_horns`、`demon_wings`、`demon_tail`                                         |
| 狼     | `wolf_ears`、`wolf_tail`、`wolf_cheeks`、`wolf_pits`、`wolf_pubes`                 |
| 猫     | `cat_ears`、`cat_tail`                                                             |
| 牛     | `cow_horns`、`cow_ears`、`cow_tail`                                                |
| 鸟     | `bird_wings`、`bird_tail`、`bird_eyes`、`bird_malar`、`bird_plumage`、`bird_pubes` |
| 狐狸   | `fox_ears`、`fox_tail`、`fox_cheeks`                                               |

每个部位接受 `level`（默认 `1`）、`style`（默认 `'default'`）和可选 `filter`。样式对应原版图片文件名，`'hidden'`、`'disabled'` 均不显示。出现等级由模组决定。

```javascript
maplebirch.npc.Transformation.add('Luna', 'cat', {
  parts: {
    cat_ears: {
      level: 1,
      filter: {
        blend: '#665544',
        blendMode: 'hard-light'
      }
    },
    cat_tail: {
      level: 2
    }
  }
});
```

未指定 `filter` 的部位使用 NPC 发色。牛耳标签等固定色素材保持原色。`filter` 还支持 `brightness`、`contrast`、`desaturate`。自定义滤镜只作用于当前 NPC 的对应部位。

已有的 `sidebar()` 字段写法继续有效，例如 `nnpc.wolf_ears_type = 'default'`。回调可覆盖 `parts` 的结果，自定义资源仍可通过 `layers` 注册。

## 成长与查询

下面的修改示例在 NPC 已载入且剧情行动实际完成时执行，不能作为每次渲染的初始化代码：

```javascript
const transformation = maplebirch.npc.Transformation;
transformation.build('Luna', 'wolf', 10); // 增加成长值，负数用于减少
```

查询状态不会增加成长。按本页默认门槛，从零增加 `10` 点后为 `2` 级：

```javascript
maplebirch.npc.Transformation.level('Luna', 'wolf'); // 2
maplebirch.npc.Transformation.type('Luna'); // 'wolfgirl'
```

需要由剧情直接指定等级时，使用 `set()`；清除转化则单独调用 `clear()`：

```javascript
const transformation = maplebirch.npc.Transformation;
transformation.set('Luna', 'wolf', 3); // 设置等级，同时对齐成长值
```

```javascript
const transformation = maplebirch.npc.Transformation;
transformation.clear('Luna', 'wolf'); // 仅在剧情要求清除时调用
```

`build()`、`set()`、`get()` 返回 `{ build, level }`。`get()` 会初始化缺失状态。`level()`、`type()` 和渲染查询不会创建存档记录。`clear(name)` 清除该 NPC 的全部转化。

`get()` 返回保存的状态对象，`build()` 与 `set()` 也返回修改后的同一类状态对象。需要保存“修改前数值”用于比较时先复制，不要长期保留跨读档引用。使用这些方法修改状态，避免直接分别写入 `build` 和 `level` 导致两者不一致。

| 操作                     | 边界                                                         |
| :----------------------- | :----------------------------------------------------------- |
| `build(name, id, delta)` | 增减成长值，`delta` 必须有限；方法内会限制范围并重新计算等级 |
| `set(name, id, level)`   | 等级取整并限制到 `0` 至最高等级，成长值对齐该等级门槛        |
| `level(name, id)`        | 查询当前等级，缺少状态时为 `0`                               |
| `type(name)`             | 查询当前最高优先转化的玩法身份，无有效转化时为空字符串       |
| `clear(name, id?)`       | 删除指定转化状态，省略 ID 则清除该 NPC 所有转化；不删除定义  |

成长值限制在 `0` 至 `max` 之间，等级由 `levels` 计算。设置较高的 `max` 可在达到最高等级后继续积累成长值。未注册的类型在明确查询或修改时使用默认阈值，但不会产生渲染效果。批量读档会保留未注册类型的原有数据；已注册类型保留状态对象，并补全缺少的成长值。多种转化可同时显示。玩法身份取等级最高的转化，等级相同时比较成长值。
