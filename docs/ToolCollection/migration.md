## migration数据迁移

### 基本介绍

`migration` 是框架内置的数据版本迁移工具，用于处理数据结构变更时的版本升级。它允许开发者定义从旧版本到新版本的迁移步骤，确保数据在不同版本间的兼容性。

_可通过 `maplebirch.tool.migration` 或快捷接口 `maplebirchFrameworks.migration()` 访问。_

---

### 核心功能

#### **创建迁移实例 (create)**

_注意事项_
**版本号格式**: _必须使用语义化版本号，如 `1.0.0`_
**迁移顺序**: _迁移步骤会按版本号升序执行_

- 创建一个新的迁移器实例
- **@return**: 新的迁移器实例
- **@example**:

  ```javascript
  // 标准访问方式
  const migrator = maplebirch.tool.migration.create();

  // 快捷访问方式
  const migrator = maplebirchFrameworks.migration();
  ```

#### **添加迁移步骤 (add)**

- 添加一个从指定版本到目标版本的迁移函数
- **@param**:
  - `fromVersion` (string): 源版本号
  - `toVersion` (string): 目标版本号
  - `migrationFn` (function): 迁移函数，接收数据和工具对象
- **@return**: void
- **@example**:
  ```javascript
  migrator.add('1.0.0', '1.1.0', (data, utils) => {
    utils.rename(data, 'oldField', 'newField');
  });
  ```

#### **执行迁移 (run)**

- 执行从当前版本到目标版本的所有迁移步骤
- **@param**:
  - `data` (Record<string, any>): 要迁移的数据对象
  - `targetVersion` (string): 目标版本号
- **@return**: void
- **@example**:
  ```javascript
  const data = { version: '1.0.0', oldField: 'value' };
  migrator.run(data, '1.2.0');
  // 执行后 data = { version: '1.2.0', newField: 'value' }
  ```

---

### 迁移工具方法 (Utils)

#### **resolvePath**

- 解析对象路径，支持创建缺失的路径
- **@param**:
  - `obj` (Record<string, any>): 要解析的对象
  - `path` (string): 路径字符串，使用点号分隔
  - `createIfMissing` (boolean): 是否创建缺失的路径，默认为 false
- **@return**: 包含父对象和键名的结果对象或 null
- **@example**:
  ```javascript
  const data = { user: { profile: { name: 'Alice' } } };
  const result = utils.resolvePath(data, 'user.profile.name');
  // result = { parent: { name: 'Alice' }, key: 'name' }
  ```

#### **rename / move**

- 重命名或移动属性
- **@param**:
  - `data` (Record<string, any>): 数据对象
  - `oldPath` (string): 旧属性路径
  - `newPath` (string): 新属性路径
- **@return**: boolean，表示是否成功
- **@example**:
  ```javascript
  const data = { oldField: 'value' };
  utils.rename(data, 'oldField', 'newField');
  // data = { newField: 'value' }
  ```

#### **remove**

- 删除指定路径的属性
- **@param**:
  - `data` (Record<string, any>): 数据对象
  - `path` (string): 要删除的属性路径
- **@return**: boolean，表示是否成功
- **@example**:
  ```javascript
  const data = { field1: 'value1', field2: 'value2' };
  utils.remove(data, 'field1');
  // data = { field2: 'value2' }
  ```

#### **transform**

- 转换指定路径的属性值
- **@param**:
  - `data` (Record<string, any>): 数据对象
  - `path` (string): 属性路径
  - `transformer` (function): 转换函数
- **@return**: boolean，表示是否成功
- **@example**:
  ```javascript
  const data = { count: '123' };
  utils.transform(data, 'count', value => parseInt(value, 10));
  // data = { count: 123 }
  ```

#### **fill**

- 使用默认值填充缺失的属性
- **@param**:
  - `target` (Record<string, any>): 目标对象
  - `defaults` (Record<string, any>): 默认值对象
  - `options` (object): 配置选项，包含 `mode` 属性
    - `mode`: 'merge'(合并)或 'replace'(替换)
- **@return**: void
- **@example**:
  ```javascript
  const data = { existing: 'value' };
  const defaults = { existing: 'default', newField: 'default' };
  utils.fill(data, defaults, { mode: 'merge' });
  // data = { existing: 'value', newField: 'default' }
  ```

---

### 自定义数据修改

_除了使用迁移工具方法外，您也可以直接对 `data` 对象进行任意修改。迁移函数接收两个参数：`data`(要迁移的数据)和 `utils`(工具方法集)。_

#### **直接修改示例**

```javascript
migrator.add('1.0.0', '1.1.0', (data, utils) => {
  // 直接修改 data 对象
  if (data.oldArray && Array.isArray(data.oldArray)) {
    data.newArray = data.oldArray.map(item => ({
      ...item,
      newProperty: 'default'
    }));
    delete data.oldArray;
  }

  // 也可以结合工具方法
  utils.rename(data, 'some.field', 'some.renamedField');
});
```

#### **复杂数据结构重构**

```javascript
migrator.add('2.0.0', '2.1.0', (data, utils) => {
  // 直接操作数据
  if (data.characters && Array.isArray(data.characters)) {
    // 将字符数组转换为对象映射
    const charactersMap = {};
    data.characters.forEach(char => {
      charactersMap[char.id] = char;
    });
    data.characters = charactersMap;
  }

  // 添加新的根级属性
  data.metadata = {
    migratedAt: new Date().toISOString(),
    version: '2.1.0'
  };
});
```

---

### 完整使用示例

```javascript
// 创建迁移器(两种方式均可)
const migrator = maplebirch.tool.migration.create();
// const migrator = maplebirchFrameworks.migration();

// 添加迁移步骤
migrator.add('1.0.0', '1.1.0', (data, utils) => {
  // 使用工具方法重命名字段
  utils.rename(data, 'user.name', 'user.fullName');

  // 直接转换数据类型
  if (typeof data.user.age === 'string') {
    data.user.age = parseInt(data.user.age, 10);
  }

  // 使用工具方法删除旧字段
  utils.remove(data, 'user.deprecatedField');
});

// 执行迁移
const userData = {
  version: '1.0.0',
  user: {
    name: 'Alice',
    age: '25',
    deprecatedField: 'oldValue'
  }
};

migrator.run(userData, '1.1.0');

// 迁移后结果：
// {
//   version: '1.1.0',
//   user: {
//     fullName: 'Alice',
//     age: 25
//   }
// }
```
