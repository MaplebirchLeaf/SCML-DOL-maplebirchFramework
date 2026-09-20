# 数据迁移

`migration` 用于升级模组的存档数据。通过 `maplebirch.tool.migration` 创建实例，注册版本转换，再对存档中的对象执行迁移。

## 使用入口

```javascript
const migrator = maplebirch.tool.migration.create();
// 也可以使用 new maplebirch.tool.migration()

migrator.add('1.0.0', '1.1.0', (data, utils) => {
  utils.move(data, 'user.name', 'user.fullName');
  utils.transform(data, 'user.age', value => Number(value));
  utils.remove(data, 'user.deprecatedField');
});

const data = {
  version: '1.0.0',
  user: { name: 'Alice', age: '25', deprecatedField: true }
};
migrator.run(data, '1.1.0');
// data: { version: '1.1.0', user: { fullName: 'Alice', age: 25 } }
```

## 版本与执行顺序

版本使用 `1.0.0` 这样的数字分段字符串。没有 `data.version` 时按 `0.0.0` 处理。

`add(from, to, apply)` 注册同步转换函数；`from` 可以是具体版本或 `'*'`。重复的版本组合和不能向前推进的步骤不会注册。

`run(data, targetVersion)` 优先选择起点等于当前版本的步骤，否则使用通配步骤。同类候选中选择不超过目标版本的最高终点，因此跨度较大的步骤必须包含中间版本需要的转换。每一步成功后更新 `data.version`；没有可用步骤时停止，不会直接把版本写成目标值。

步骤抛出异常时停止并向调用者抛出带有 `fromVersion`、`toVersion`、`cause` 的错误。已经发生的数据修改不会自动回滚。

## 迁移工具

回调的第二个参数与 `migrator.utils` 提供相同工具。

| 方法                            | 说明                                                                    |
| :------------------------------ | :---------------------------------------------------------------------- |
| `path(obj, route, create?)`     | 解析点分路径，返回 `{ parent, key }` 或 `null`；`create` 默认为 `false` |
| `move(data, from, to)`          | 移动或重命名属性，成功返回 `true`                                       |
| `remove(data, route)`           | 删除已有属性，成功返回 `true`                                           |
| `transform(data, route, fn)`    | 转换已有值，成功返回 `true`                                             |
| `fill(target, defaults, mode?)` | 递归填充缺失的默认值；`mode` 为 `'merge'` 或 `'cover'`，默认 `'merge'`  |
| `log(message, level, ...data)`  | 输出迁移日志                                                            |

路径只遍历对象自身的属性，不允许 `__proto__`、`prototype`、`constructor`。移动到相同路径保持原值；不能将父对象移动到自己的子路径。目标属性已存在时，`move()` 会覆盖它。

`transform()` 的输入是 `unknown`，转换前应检查类型。转换函数抛错时保留旧值、记录日志并返回 `false`。

## 填充默认值

```javascript
migrator.add('*', '1.2.0', (data, utils) => {
  utils.fill(data, {
    settings: { enabled: true, volume: 0.8 },
    flags: {}
  });
});
```

`fill()` 保留已有标量和数组，递归补齐已有普通对象中的缺失字段，并跳过根对象的 `version`。例如 `{ settings: { enabled: false } }` 会保留 `false` 并补入 `volume`。

默认值填充适合结构增补。字段重命名或类型变化应注册具体版本步骤，也可以在回调中检查数据类型后直接修改 `data`。
