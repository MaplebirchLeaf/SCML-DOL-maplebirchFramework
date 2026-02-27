## ModuleSystem模块系统

### 基本介绍

`ModuleSystem`是框架的模块化加载与依赖管理系统。它负责管理模块的注册、依赖解析和生命周期初始化，确保模块按正确的顺序加载和执行。

---

### 核心功能

#### **模块注册 (register)**

- 注册一个新模块到系统中
- **@param**:
  - `name` (string): 模块名称
  - `module` (any): 模块对象，可以包含初始化方法
  - `dependencies` (string[]): 依赖模块列表，默认空数组
  - `source` (string): 模块来源标识，用于扩展模块
- **@return**: `boolean`，表示是否成功注册
- **@example**:

  ```javascript
  // 注册一个简单模块
  maplebirch.register('myModule', {
    Init() {
      console.log('模块初始化');
    }
  });

  // 注册带依赖的模块
  maplebirch.register(
    'myModule2',
    {
      Init() {
        console.log('依赖var和tool模块');
      }
    },
    ['var', 'tool']
  );

  // 注册扩展模块
  maplebirch.register(
    'myExtension',
    {
      sayHello() {
        return 'Hello World';
      }
    },
    [],
    'my-mod-name'
  );
  ```

#### **模块查询 (getModule)**

- 获取已注册的模块实例
- **@param**: `name` (string): 模块名称
- **@return**: 模块对象或undefined
- **@example**:
  ```javascript
  const addonModule = maplebirch.getModule('addon');
  ```

#### **依赖关系图 (dependencyGraph)**

- 获取所有模块的依赖关系图
- **@return**: 包含所有模块依赖信息的对象
- **@example**:
  ```javascript
  const graph = maplebirch.dependencyGraph;
  console.log(graph.addon);
  // 输出: {
  //   dependencies: [],
  //   dependents: ['dynamic', 'tool', ...],
  //   state: 'MOUNTED',
  //   allDependencies: [],
  //   source: null
  // }
  ```

---

### 模块状态说明

每个模块在整个生命周期中会经历以下状态：

| 状态常量     | 值  | 说明                         |
| :----------- | :-- | :--------------------------- |
| `REGISTERED` | 0   | _模块已注册，但未初始化_     |
| `LOADED`     | 1   | _模块已完成预初始化_         |
| `MOUNTED`    | 2   | _模块已完成主初始化_         |
| `EXTENSION`  | 3   | _扩展模块，已挂载到框架实例_ |
| `ERROR`      | 4   | _模块初始化过程中发生错误_   |

---

### 模块初始化方法

模块可以定义以下生命周期方法，_所有方法都是可选的_：

#### **preInit()**

*在`afterInjectEarlyLoad`阶段调用。*每个模块只会执行一次*，用于资源预加载和基础设置，此时没有setup变量和V变量。*

- **@example**:
  ```javascript
  preInit() {
    // 预加载资源
    this.cache = new Map();
    console.log('模块预初始化完成');
  }
  ```

#### **Init()**

*在`:passageinit`事件后调用。*每个模块只会执行一次*，用于模块主初始化，此时已有setup变量和V变量。*

- **@example**:
  ```javascript
  Init() {
    // 主初始化逻辑
    this.setupEventListeners();
    this.loadConfig();
    console.log('模块初始化完成');
  }
  ```

#### **loadInit()**

*仅在读取存档时调用。*每次读取存档时都会执行*，用于恢复存档状态，此时有存档中的V变量。*

- **@example**:
  ```javascript
  loadInit() {
    if (V.myData) {
      this.data = V.myData;
    }
    console.log('存档数据恢复完成');
  }
  ```

#### **postInit()**

*在每个段落开始时调用，在Init和loadInit之后执行。*每个段落都会执行一次*，此时有当前V变量。*

- **@example**:
  ```javascript
  postInit() {
    this.cleanupTemporaryData();
    this.finalizeSetup();
    console.log('段落后处理完成');
  }
  ```

---

### 完整模块示例

```javascript
class MyModule {
  // 声明依赖模块
  dependencies = ['addon', 'dynamic'];

  // 预初始化 - 资源预加载(只执行一次)
  async preInit() {
    console.log('MyModule 预初始化');
    this.cache = new Map();
  }

  // 主初始化 - 主要功能设置(只执行一次)
  async Init() {
    console.log('MyModule 主初始化');
    this.setup();
  }

  // 存档初始化 - 恢复存档状态(每次读取存档时执行)
  async loadInit() {
    console.log('MyModule 存档初始化');
    if (V.myModuleData) {
      this.data = V.myModuleData;
    }
  }

  // 后初始化 - 段落清理(每个段落执行一次)
  async postInit() {
    console.log('MyModule 后初始化');
    this.cleanup();
  }

  // 模块功能方法
  setup() {
    // 设置逻辑
  }

  cleanup() {
    // 清理逻辑
  }

  // 自定义方法
  myFunction() {
    return 'Hello from MyModule';
  }
}

// 注册模块
maplebirch.register('myModule', new MyModule());
```

---

### 依赖管理

#### **声明依赖**

```javascript
// 在模块类中声明
class MyModule {
  dependencies = ['var', 'tool'];
  // ...
}

// 或在注册时声明
maplebirch.register('myModule', myModuleInstance, ['var', 'tool']);
```

#### **依赖规则**

1. _模块会在其所有依赖初始化完成后才初始化_
2. _支持传递依赖(模块A依赖B，B依赖C，则A依赖C)_
3. _循环依赖会被自动检测并阻止_

#### **依赖图查询**

```javascript
// 查看模块的依赖关系
const graph = maplebirch.dependencyGraph;
console.log('addon模块的依赖:', graph.addon.dependencies);
console.log('依赖addon的模块:', graph.addon.dependents);
```

---

### 注意事项

1. **模块命名**: _避免使用保留名称，如`core`、`modules`等_
2. **初始化顺序**: _依赖解析基于拓扑排序，确保理解排序逻辑_
3. **错误处理**: _单个模块初始化失败不会影响其他模块_
4. **禁用机制**: _模块可以从模组加载器配置中禁用_
5. **扩展模块**: _扩展模块会挂载到`maplebirch`实例上，可用于全局访问_
