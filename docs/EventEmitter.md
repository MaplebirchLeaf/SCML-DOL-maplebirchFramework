## EventEmitter事件发射器

### 基本介绍

`EventEmitter`是框架内置的一个轻量级事件发布/订阅系统。它允许框架内部的不同模块，以及开发者编写的代码，在特定时刻(如游戏初始化、段落加载、存档读取时)执行自定义辑。系统采用订阅-发布模式，支持内置事件与自定义事件，并确保了事件的同步/异步回调执行与错误处理。

---

### 核心功能

#### **事件监听 (on)**

_用于注册一个持续有效的事件监听器。_

- **@param**:
  - `eventName` (string): 要监听的事件名称。可以使用框架内置的(如 `:passagestart`)，或自定义的任意字符串。
  - `callback` (function): 事件触发时要执行的回调函数。可接受任意参数。
  - `description` (string, 可选): 对该监听器的描述，可用于后续移除监听器。
- **@return**: `boolean`，表示监听器是否成功注册(如果已存在相同函数引用的监听器，则返回 `false`)。
- **@example**:
  ```javascript
  // 监听段落开始事件
  maplebirch.on(':passagestart', () => console.log('新段落开始了！'), '我的段落监听器');
  ```

#### **移除监听 (off)**

_用于移除一个已注册的事件监听器。_

- **@param**:
  - `eventName` (string): 要移除监听器的事件名称。
  - `identifier` (Function | string): 标识要移除哪个监听器。可以是注册时传入的 `callback` 函数本身，或者是注册时提供的 `description` 字符串，亦或是系统自动生成的 `internalId`。
- **@return**: `boolean`，表示是否成功移除了监听器。

#### **单次监听 (once)**

_注册一个监听器，该监听器在事件触发**一次**后会自动移除。_

- 其参数与 `on` 方法相同。常用于只需要执行一次的初始化任务。

#### **触发事件 (trigger)**

_触发指定名称的事件，并按注册顺序同步执行所有关联的回调函数。支持异步回调(`async/await` 或返回 `Promise`)。_

- **参数**:
  - `eventName` (string): 要触发的事件名称。
  - `...args` (any): 传递给每个回调函数的参数。

#### **之后回调 (after)**

_注册一个回调函数，它将在下一次**对应事件被触发后**执行，且**仅执行一次**。通常用于实现“当某件事完成后，执行某个后续操作”的逻辑。_

- **参数**:
  - `eventName` (string): 事件名称。
  - `callback` (function): 要执行的回调函数。

---

### 内置事件列表

框架预定义了多个生命周期事件，方便开发者在关键节点注入逻辑：

| 事件名称          | 触发时机            |
| :---------------- | :------------------ |
| `:IndexedDB`      | 数据库初始化前      |
| `:import`         | 数据导入时          |
| `:allModule`      | 所有模块注册完成    |
| `:variable`       | 变量注入时机        |
| `:onSave`         | 游戏存档时          |
| `:onLoad`         | 游戏读档时          |
| `:onLoadSave`     | 加载存档后          |
| `:language`       | 游戏语言切换时      |
| `:storyready`     | 故事初始化完成      |
| `:passageinit`    | 段落初始化          |
| `:passagestart`   | 段落开始            |
| `:passagerender`  | 段落渲染            |
| `:passagedisplay` | 段落显示            |
| `:passageend`     | 段落结束            |
| `:sugarcube`      | 获取`SugarCube`对象 |
| `:modLoaderEnd`   | 模组加载器结束      |
