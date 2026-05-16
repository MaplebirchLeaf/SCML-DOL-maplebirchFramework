## 模块系统 (ModuleSystem)

`ModuleSystem` 是框架的模块注册、依赖排序与生命周期调度系统。一般内容模组通常不需要直接注册框架模块；只有在你明确要扩展框架内部能力时，才建议使用这一套接口。

---

## 注册模块

```javascript
maplebirch.register(name, module, dependencies);
```

| 参数           | 说明                           |
| :------------- | :----------------------------- |
| `name`         | 模块名称                       |
| `module`       | 模块对象，可以定义生命周期方法 |
| `dependencies` | 依赖模块名称数组，可选         |

示例：

```javascript
maplebirch.register('myModule', {
  Init() {
    console.log('module initialized');
  }
});
```

带依赖：

```javascript
maplebirch.register(
  'myModule',
  {
    Init() {
      console.log('runs after tool and npc');
    }
  },
  ['tool', 'npc']
);
```

模块对象也可以声明 `dependencies`，会和注册时传入的依赖合并：

```javascript
maplebirch.register(
  'myModule',
  {
    dependencies: ['tool'],
    Init() {}
  },
  ['npc']
);
```

---

## 暴露模块

如果模块对象带有 `exposed: true`，注册后会被标记为 `EXPOSED`，并直接挂载到 `maplebirch[name]`。

```javascript
maplebirch.register('myApi', {
  exposed: true,
  hello() {
    return 'Hello';
  }
});

maplebirch.myApi.hello();
```

暴露模块不会参与普通初始化流程，也不会被禁用界面当作可禁用模块处理。若名称已被占用，注册会失败。

---

## 查询模块

```javascript
const npcModule = maplebirch.get('npc');
const graph = maplebirch.dependencyGraph;
```

`dependencyGraph` 会返回每个模块的依赖、被依赖关系、状态、来源和是否为核心挂载模块等信息：

```javascript
console.log(maplebirch.dependencyGraph.npc);
```

常见字段：

| 字段              | 说明                               |
| :---------------- | :--------------------------------- |
| `protected`       | 是否为受保护模块                   |
| `mounted`         | 是否属于框架核心挂载列表           |
| `early`           | 是否会在预初始化阶段提前挂载       |
| `dependencies`    | 直接依赖                           |
| `dependents`      | 依赖该模块的模块                   |
| `allDependencies` | 传递依赖                           |
| `state`           | 当前模块状态                       |
| `source`          | 来源模组名，通常由框架加载流程记录 |

---

## 模块状态

当前状态定义来自 `ModuleState`：

| 状态         | 值  | 说明                           |
| :----------- | :-- | :----------------------------- |
| `REGISTERED` | `0` | 已注册，等待初始化             |
| `MOUNTED`    | `1` | 已完成主初始化                 |
| `ERROR`      | `2` | 初始化失败                     |
| `EXPOSED`    | `3` | 暴露模块，已直接挂载到框架对象 |
| `DISABLED`   | `4` | 被禁用，跳过初始化             |

预初始化完成不会改变模块状态，而是记录在模块系统内部的 `preInitialized` 集合中；主初始化完成后才会进入 `MOUNTED`。

---

## 生命周期方法

模块对象可以定义以下方法，全部可选：

| 方法         | 调用时机                                              | 用途                                |
| :----------- | :---------------------------------------------------- | :---------------------------------- |
| `preInit()`  | `afterInjectEarlyLoad` 后，IndexedDB 与日志准备完成后 | 提前准备资源、配置、缓存            |
| `Init()`     | 首次进入正常游戏段落的 `:passagestart` 阶段           | 主初始化，此时可使用 `setup` 和 `V` |
| `loadInit()` | 读档后进入段落时                                      | 恢复和存档相关的状态                |
| `postInit()` | 每次段落开始，主初始化或读档初始化后                  | 刷新段落级逻辑                      |

示例：

```javascript
class MyModule {
  dependencies = ['tool'];

  async preInit() {
    this.cache = new Map();
  }

  async Init() {
    this.setup();
  }

  async loadInit() {
    this.restoreFromSave();
  }

  async postInit() {
    this.refreshPassageState();
  }

  setup() {}
  restoreFromSave() {}
  refreshPassageState() {}
}

maplebirch.register('myModule', new MyModule(), ['npc']);
```

---

## 依赖规则

- 模块会在所有依赖满足后再初始化。
- 依赖会做传递收集，例如 A 依赖 B，B 依赖 C，则 A 会等待 C。
- `EXPOSED` 模块会被视为已满足依赖。
- 依赖进入 `ERROR` 或 `DISABLED` 时，依赖它的模块不会继续初始化。
- 循环依赖会在注册时被检测并阻止。

---

## 补充说明

- 内容型模组多数情况下应优先使用 `script` 加载普通脚本，而不是注册框架模块。
- 模块名称建议带模组前缀，避免和框架内置模块或其它模组冲突。
- 受保护模块不会被禁用界面关闭。
