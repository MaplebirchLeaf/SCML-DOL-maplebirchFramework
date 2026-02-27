## 文本构建工具 (htmlTools)

### 基本介绍

`htmlTools` 是一个用于动态生成和操作 HTML 内容的文本构建工具。它提供了一套流畅的 API 来创建、渲染和管理文本内容，支持自动翻译、Wiki 语法解析、文本替换等功能，并集成了 SugarCube 宏系统。
_可通过 `maplebirch.tool.text` 或快捷接口 `maplebirchFrameworks.addText()` 访问。_

---

### 核心功能

#### **注册文本处理器 (reg)**

- 注册一个文本处理器，将指定键与处理函数关联
- **@param**:
  - `key` (string): 文本处理器的键名
  - `handler` (function): 处理函数，接收 Builder 对象
  - `id` (string, 可选): 处理器的唯一标识符
- **@return**: 处理器的唯一标识符
- **@example**:

  ```javascript
  // 注册一个简单的文本处理器
  maplebirch.tool.text.reg('greeting', tools => {
    tools.text('Hello, traveler!');
  });

  // 使用快捷接口
  maplebirchFrameworks.addText('greeting', tools => {
    tools.text('Hello, traveler!');
  });
  ```

#### **删除文本处理器 (delete)**

- 删除已注册的文本处理器
- **@param**:
  - `key` (string): 处理器的键名
  - `idOrHandler` (string/function, 可选): 处理器的 ID 或处理函数
- **@return**: boolean，表示是否成功删除
- **@example**:

  ```javascript
  // 删除特定处理器
  maplebirch.tool.text.delete('greeting', 'greetingHandler1');

  // 删除键名下的所有处理器
  maplebirch.tool.text.delete('greeting');
  ```

#### **文本替换 (replaceText)**

- 在段落中替换指定的文本
- **@param**:
  - `oldText` (string): 要替换的旧文本
  - `newText` (string): 替换后的新文本
- **@example**:
  ```javascript
  maplebirch.tool.text.replaceText('old description', 'new description');
  ```

#### **链接替换 (replaceLink)**

- 在段落中替换指定的链接文本
- **@param**:
  - `oldLink` (string): 要替换的旧链接文本
  - `newLink` (string): 替换后的新链接文本
- **@example**:
  ```javascript
  maplebirch.tool.text.replaceLink('Go to town', '前往城镇');
  ```

---

### Builder 工具

Builder 是文本处理器的核心，提供了一系列方法来构建文本内容：

#### **text(content, style)**

- 添加一段文本
- **@param**:
  - `content` (string): 文本内容
  - `style` (string, 可选): CSS 类名
- **@return**: Builder 实例(支持链式调用)
- **@example**:
  ```javascript
  tools.text('这是一段普通文本');
  tools.text('高亮文本', 'highlight');
  ```

#### **line(content, style)**

- 添加换行和文本
- **@param**:
  - `content` (string, 可选): 文本内容
  - `style` (string, 可选): CSS 类名
- **@return**: Builder 实例
- **@example**:
  ```javascript
  tools.text('第一行');
  tools.line(); // 换行
  tools.text('第二行');
  tools.line('第三行', 'important'); // 换行并添加文本
  ```

#### **wikify(content)**

- 解析并添加 Wiki 语法内容
- **@param**: `content` (string): Wiki 语法内容
- **@return**: Builder 实例
- **@example**:
  ```javascript
  tools.wikify('<<set $name to "Alice">>');
  tools.wikify('{{$name}} 你好！');
  ```

#### **raw(content)**

- 添加原始节点或文本
- **@param**: `content` (Node/string): DOM 节点或文本
- **@return**: Builder 实例
- **@example**:

  ```javascript
  // 添加文本节点
  tools.raw('原始文本');

  // 添加 DOM 节点
  const span = document.createElement('span');
  span.textContent = 'Span 元素';
  tools.raw(span);
  ```

#### **box(content, style)**

- 创建一个带样式的盒子容器
- **@param**:
  - `content` (Node/string, 可选): 内容
  - `style` (string, 可选): CSS 类名
- **@return**: Builder 实例
- **@example**:
  ```javascript
  tools.box('这是一个盒子', 'card');
  ```

---

### 完整使用示例

#### **示例1：注册处理器并在宏中使用**

```javascript
// 1. 注册文本处理器
maplebirch.tool.text.reg('gameStatus', (tools) => {
  const { variables } = State;

  tools
    .text('角色状态:', 'header')
    .line(`生命: ${variables.health}/${variables.maxHealth}`)
    .line(`魔力: ${variables.mana}/${variables.maxMana}`)
    .line(`体力: ${variables.stamina}`)
    .line(`金币: ${variables.gold}`);
});

// 2. 在 SugarCube 段落中使用宏
你检查了自己的状态：
<<maplebirchTextOutput "gameStatus">>
然后继续你的冒险。
```

#### **示例2：动态文本替换**

```javascript
// 替换游戏中的特定文本
<<script>>
  // 替换描述文本
  maplebirch.tool.text.replaceText(
    'You see a small hut in the forest.',
    '你在森林中发现了一个小屋。'
  );

  // 替换链接文本
  maplebirch.tool.text.replaceLink(
    'Enter the hut',
    '进入小屋'
  );
<</script>>
```

#### **示例3：复杂界面组合**

```javascript
// 注册多个处理器
maplebirch.tool.text.reg('header', (tools) => {
  tools.text('游戏状态', 'main-header');
});

maplebirch.tool.text.reg('stats', (tools) => {
  tools
    .line(`生命: ${V.health}`)
    .line(`魔力: ${V.mana}`)
    .line(`位置: ${V.location}`);
});

maplebirch.tool.text.reg('inventory', (tools) => {
  const inventory = V.inventory || [];
  if (inventory.length > 0) {
    tools.text('物品:', 'subheader');
    inventory.forEach(item => {
      tools.line(`- ${item.name} x${item.quantity}`);
    });
  }
});

// 在段落中一次性渲染所有
<<maplebirchTextOutput "header, stats, inventory">>
```

#### **示例4：带上下文的动态内容**

```javascript
// 注册可接收上下文的处理器
maplebirch.tool.text.reg('dynamicMessage', tools => {
  // 从上下文获取数据
  const message = tools.context.message || '默认消息';
  const style = tools.context.style || '';

  tools.text(message, style);
});

// 在 JavaScript 中渲染
const fragment = maplebirch.tool.text.renderFragment('dynamicMessage', {
  message: '特殊事件触发！',
  style: 'important'
});
```

---

### 自动翻译集成

所有通过 Builder 添加的文本都会自动进行翻译处理：

```javascript
// 注册会自动翻译的处理器
maplebirch.tool.text.reg('translatedContent', tools => {
  // 如果当前语言是中文，"Hello" 会被自动翻译
  tools.text('Hello'); // 显示: "你好" (中文环境下)
  tools.text('Good morning'); // 显示: "早上好" (中文环境下)

  // 也可以手动使用翻译键
  const translated = maplebirch.t('ui_welcome');
  tools.text(translated || 'Welcome');
});
```

---

### 注意事项

1. **自动翻译**: Builder 中的所有文本都会通过 `tools.auto()` 自动翻译
2. **宏注册**: `<<maplebirchTextOutput>>` 宏在框架初始化时自动注册
3. **性能考虑**: 复杂的文本处理器可能影响性能，建议合理使用
4. **Wiki 语法**: 使用 `wikify()` 方法可以解析和执行 Wiki 语法
5. **替换时机**: 文本替换应在段落渲染完成后进行
