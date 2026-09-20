# NPC 转化

通过 `maplebirch.npc.Transformation` 注册命名 NPC 的转化、成长阶段和侧栏部位。转化状态独立保存在 `V.maplebirch.npc[name.toLowerCase()].transformation`，不会改写 PC 的转化。

## 注册转化

```javascript
maplebirch.npc.Transformation.add('Example', 'wolf', {
  levels: [5, 10, 15, 20, 25, 30],
  type: 'wolfgirl',
  parts: {
    wolf_ears: { level: 1 },
    wolf_tail: { level: 2 },
    wolf_cheeks: { level: 3, style: 'feral' },
    wolf_pits: { level: 4 },
    wolf_pubes: { level: 4 }
  },
  sidebar(nnpc) {
    nnpc.wolf_tail_layer = 'back';
  }
});
```

第一个参数是 NPC 的 `nam`，第二个参数是只属于该 NPC 的转化 ID。不同 NPC 可以分别注册同名的 `wolf`，彼此不会覆盖；注册本身不会给 NPC 增加转化。

| 配置                             | 说明                                                                     |
| :------------------------------- | :----------------------------------------------------------------------- |
| `levels`                         | 各等级的累计成长值，必须为递增的正数；默认 `[5, 10, 15, 20, 25, 30]`     |
| `type`                           | `Transformation.type(name)` 返回的玩法身份，不改写 NPC 基础数据的 `type` |
| `parts`                          | 按等级启用原版转化部位，主、副 NPC 模型均支持                            |
| `body(bodydata, state, npcName)` | 修改本次渲染的身体数据副本，例如 `hairColour`、`eyeColour`               |
| `sidebar(nnpc, state, npcName)`  | 部位配置应用后执行，用于调整位置、姿态或样式                             |
| `layers`                         | 通过角色图层接口向 `main` 模型注册自定义图层                             |

`body` 和 `sidebar` 的 `state` 提供只读的 `build`、`level`。`sidebar` 接收正在组装的渲染对象，此时服装、身体滤镜和遮罩尚未全部生成。

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

每个部位接受 `level`（默认 `1`）、`style`（默认 `'default'`）和可选 `filter`。样式对应原版图片文件名，`'hidden'`、`'disabled'` 均不显示；出现等级由模组决定。

```javascript
maplebirch.npc.Transformation.add('Example', 'cat', {
  parts: {
    cat_ears: { level: 1, filter: { blend: '#665544', blendMode: 'hard-light' } },
    cat_tail: { level: 2 }
  }
});
```

未指定 `filter` 的部位使用 NPC 发色；牛耳标签等固定色素材保持原色。`filter` 还支持 `brightness`、`contrast`、`desaturate`。自定义滤镜只作用于当前 NPC 的对应部位。

已有的 `sidebar()` 字段写法继续有效，例如 `nnpc.wolf_ears_type = 'default'`。回调可覆盖 `parts` 的结果，自定义资源仍可通过 `layers` 注册。

## 成长与查询

```javascript
const transformation = maplebirch.npc.Transformation;
transformation.build('Example', 'wolf', 10); // 增加成长值，负数用于减少
transformation.set('Example', 'wolf', 3); // 设置等级，同时对齐成长值
transformation.level('Example', 'wolf'); // 3
transformation.type('Example'); // 'wolfgirl'
transformation.clear('Example', 'wolf');
```

`build()`、`set()`、`get()` 返回 `{ build, level }`；`get()` 会初始化缺失状态。`level()`、`type()` 和渲染查询不会创建存档记录。`clear(name)` 清除该 NPC 的全部转化。

成长值限制在 `0` 至最后一级阈值之间，等级由成长值计算；未注册的类型使用默认阈值，但不会产生渲染效果。读档时保留已有状态对象，补全缺少的成长值。多种转化可同时显示；玩法身份取等级最高的转化，等级相同时比较成长值。
