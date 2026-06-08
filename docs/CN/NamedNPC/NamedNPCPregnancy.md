# NPC 怀孕

NPC 怀孕支持只是接入原版怀孕系统的桥，不会把一个种族变成另一个种族。

这个系统是双向的：

- NPC 可以让 PC 怀孕。
- PC 也可以让 NPC 怀孕。

同一个怀孕种族和同一个生成器会同时服务这两个方向。

## NPC 数据

需要进入怀孕系统的 NPC，要在 `pregnancy.enabled` 中启用。`pregnancy.type` 是精液记录和怀孕生成时使用的怀孕种族。

```javascript
maplebirch.npc.add({
  nam: 'Plant Girl',
  type: 'plant',
  gender: 'f',
  vagina: 'clothed',
  penis: 'none',
  pregnancy: {
    enabled: true,
    type: 'plant'
  }
});
```

## 添加种族

自定义怀孕种族只在脚本中注册。添加种族只表示框架在怀孕过滤时保留这个类型，它本身不会生成怀孕数据。

```javascript
maplebirch.npc.addPregnancy('plant');
```

## 完整注册

自定义种族至少需要提供 `generator`。其它回调是可选的，但能让剩余天数、子代活动、怀孕称呼等显示更完整。

```javascript
maplebirch.npc.addPregnancy('plant', {
  generator(mother, father, fatherKnown, genital) {
    const pcIsMother = mother === 'pc';
    const pcIsFather = father === 'pc';

    return {
      type: 'plant',
      timer: 0,
      timerEnd: pcIsMother ? random(120, 180) : random(160, 220),
      fetus: [
        {
          type: 'plant',
          mother,
          father,
          fatherKnown: fatherKnown || pcIsFather,
          genital,
          birthId: 0,
          childId: `plant-${mother}-${father}-${Time.days}`,
          gender: 'f',
          features: {},
          localVariables: {}
        }
      ]
    };
  },

  eta(pregnancy) {
    return pregnancy.timerEnd ? Math.floor(pregnancy.timerEnd - pregnancy.timer) : null;
  },

  birth: {
    birthLocation: 'forest',
    location: 'home'
  },

  childActivity(childId, child) {
    return random(0, 1) ? 'sleeping' : 'sprouting';
  },

  text: {
    single: 'seedling',
    multiple: 'seedlings'
  }
});
```

## 注册字段

| 字段 | 类型 | 作用 |
| :--- | :--- | :--- |
| `generator` | `(mother, father, fatherKnown, genital) => pregnancy` | 生成怀孕数据，并安装到 `window.pregnancyGenerator[type]`。 |
| `birth` | 对象或 `(type, pregnancy) => object` | 注册这个自定义种族的默认出生地点和孩子地点。 |
| `eta` | `(pregnancy) => number \| null` | 覆盖这个自定义种族的 `window.pregnancyDaysEta()` 显示。 |
| `childActivity` | `(childId, child) => string \| null \| false \| void` | 覆盖这个自定义种族孩子的 `<<updateChildActivity>>`。 |
| `text` | 对象或 `(pregnancy, count, target) => string` | 覆盖这个自定义种族的 `<<pregnancyBabyText>>` 称呼。 |

## 回调参数

### `generator(mother, father, fatherKnown, genital)`

| 参数 | 含义 |
| :--- | :--- |
| `mother` | 受孕方，可以是 `'pc'` 或命名 NPC 名称。 |
| `father` | 使其受孕的一方，可以是 `'pc'` 或命名 NPC 名称。 |
| `fatherKnown` | 是否知道父方。 |
| `genital` | 怀孕部位，通常是 `'vagina'`；PC 怀孕时也可能传入其它原版部位键。 |

`mother === 'pc'` 表示 NPC 让 PC 怀孕。`father === 'pc'` 表示 PC 让 NPC 怀孕。

返回对象必须包含非空 `fetus` 数组。如果这次怀孕还要进入原版出生、子代系统，其它字段也需要接近原版怀孕对象结构。

### `eta(pregnancy)`

| 参数 | 含义 |
| :--- | :--- |
| `pregnancy` | 当前怀孕对象。PC 怀孕通常是 `V.sexStats[genital].pregnancy`；NPC 怀孕通常是 `C.npc[name].pregnancy`。 |

返回剩余天数；无法稳定显示时返回 `null`。

### `birth`

`birth` 可以是普通对象：

```javascript
birth: {
  birthLocation: 'forest',
  location: 'home'
}
```

也可以是函数：

```javascript
birth(type, pregnancy) {
  return {
    birthLocation: type === 'plant' ? 'forest' : 'unknown',
    location: pregnancy?.npcAwareOf ? 'home' : 'forest'
  };
}
```

| 参数 | 含义 |
| :--- | :--- |
| `type` | 已注册的怀孕种族，例如 `'plant'`。 |
| `pregnancy` | 可选的怀孕对象，由调用方传入。 |

| 返回字段 | 含义 |
| :--- | :--- |
| `birthLocation` | 出生发生地点。原版会把它写入 `V.children[childId].birthLocation`。 |
| `location` | 出生后孩子所在地点。原版会把它写入 `V.children[childId].location`。 |

注册后的数据可通过 `maplebirch.npc.Pregnancy.birthLocation(type, pregnancy)` 读取。原版 `giveBirthToChildren()` 会根据 `location` 对 `home`、`wolf_cave`、`tower` 等地点调用 `setKnowsAboutPregnancy()`，后续系统也会查询孩子的 `location` / `birthLocation`。

### `childActivity(childId, child)`

| 参数 | 含义 |
| :--- | :--- |
| `childId` | `V.children` 中使用的孩子键名。 |
| `child` | `V.children[childId]` 对应的孩子对象。通常包含 `type`、`born`、`localVariables` 以及原版子代数据。 |

返回字符串时，会写入 `child.localVariables.activity`。返回 `null`、`false` 或 `undefined` 时，表示框架已处理该自定义种族，但不修改活动文本。

### `text(pregnancy, count, target)`

| 参数 | 含义 |
| :--- | :--- |
| `pregnancy` | 正在显示的怀孕对象。 |
| `count` | 显示数量。除非原版知情标记显示多胎，否则框架按 `1` 处理。 |
| `target` | `<<pregnancyBabyText>>` 传入的显示目标，通常是 `undefined`、`'pc'` 或命名 NPC 名称。 |

## 运行接点

| 入口 | 原版/框架作用 | 框架作用 |
| :--- | :--- | :--- |
| `setup.pregnancy.typesEnabled` | `recordSperm` 用它过滤合法精液类型。 | 加入自定义怀孕种族。 |
| `window.pregnancyGenerator` | 保存原版怀孕生成器。 | 加入自定义生成器。 |
| `window.recordSperm` | 战斗和事件中记录精液。 | 先给自定义命名 NPC 补齐 `spermType`，再交回原版逻辑。 |
| `maplebirch.dynamic.regTimeEvent('onDay', 'NPCPregnancyCycle', ...)` | 框架时间事件。 | 每跨过一天运行一次自定义 NPC 受孕检查。 |
| `<<playerPregnancyAttempt>>` | 尝试让 PC 怀孕。 | 处理自定义精液；没有自定义精液时交回原版宏。 |
| `<<namedNpcPregnancy>>` | 让指定命名 NPC 怀孕。 | 处理自定义母体/父方组合；原版组合交回原版宏。 |
| `window.pregnancyDaysEta()` | 显示剩余怀孕天数。 | 自定义种族走注册的 `eta`。 |
| `<<updateChildActivity>>` | 更新孩子日常活动。 | 自定义孩子走注册的 `childActivity`。 |
| `<<pregnancyBabyText>>` | 输出 `baby/pup/chick` 一类称呼。 | 自定义种族走注册的 `text`。 |

`defaultBirthLocations()` 和 `giveBirthToChildren()` 是原版 `pregnancy.js` 里的闭包函数，框架暂时不会直接替换。`birth` 注册表用于让自定义出生处理避开原版 `unknown` 地点。

## 原版路线

原版 `human`、`wolf`、`wolfboy`、`wolfgirl`、`hawk`、`harpy` 仍然走原版逻辑。框架路线只处理会被原版过滤掉的自定义种族。
