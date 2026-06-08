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

添加种族只表示框架在怀孕过滤时保留这个类型。它本身不会生成怀孕数据。自定义怀孕种族只在脚本中注册：

```javascript
maplebirch.npc.addPregnancy('plant');
```

## 完整注册

自定义种族至少需要提供 `generator`。如果要让出生地点、剩余天数、子代活动、怀孕称呼也能正常显示，可以一次性注册完整配置。

`generator` 参数与原版生成器一致：

| 参数 | 含义 |
| :--- | :--- |
| `mother` | 受孕方，可以是 `'pc'` 或 NPC 名称 |
| `father` | 使其受孕的一方，可以是 `'pc'` 或 NPC 名称 |
| `fatherKnown` | 是否知道父方 |
| `genital` | 怀孕部位，通常是 `'vagina'` |

`mother === 'pc'` 表示 NPC 让 PC 怀孕。`father === 'pc'` 表示 PC 让 NPC 怀孕。

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

  birth: {
    birthLocation: 'forest',
    location: 'home'
  },

  eta(pregnancy) {
    return pregnancy.timerEnd ? Math.floor(pregnancy.timerEnd - pregnancy.timer) : null;
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

返回对象必须包含非空 `fetus` 数组。如果这次怀孕还要进入原版出生、子代系统，其它字段也需要符合原版出生与子代系统期望的数据结构。

可注册项：

| 字段 | 对应原版位置 | 作用 |
| :--- | :--- | :--- |
| `generator` | `window.pregnancyGenerator[type]` | 生成怀孕数据。 |
| `birth` | 框架辅助注册表 | 保存默认出生地点，供模组事件或后续出生 UI 调用。 |
| `eta` | `window.pregnancyDaysEta()` | 自定义剩余天数。 |
| `childActivity` | `<<updateChildActivity>>` | 给自定义种族孩子分配日常活动。 |
| `text` | `<<pregnancyBabyText>>` | 自定义 `baby/babies` 这类称呼。 |

## 原版接点

框架只接管自定义种族需要穿过的原版入口：

| 原版入口 | 原版作用 | 框架作用 |
| :--- | :--- | :--- |
| `setup.pregnancy.typesEnabled` | `recordSperm` 用它过滤合法精液类型。 | 加入自定义怀孕种族。 |
| `window.pregnancyGenerator` | 保存原版怀孕生成器。 | 加入自定义生成器。 |
| `window.recordSperm` | 战斗和事件中记录精液。 | 先给自定义命名 NPC 补齐 `spermType`，再交回原版逻辑。 |
| `npcPregnancyCycle()` | 每日推进 NPC 怀孕，并尝试 NPC 受孕。 | 原版先完整执行，再补一轮自定义种族 NPC 受孕。 |
| `<<playerPregnancyAttempt>>` | 尝试让 PC 怀孕。 | 处理自定义精液；没有自定义精液时交回原版宏。 |
| `<<namedNpcPregnancy>>` | 让指定命名 NPC 怀孕。 | 处理自定义母体/父方组合；原版组合交回原版宏。 |
| `window.pregnancyDaysEta()` | 显示剩余怀孕天数。 | 自定义种族走注册的 `eta`。 |
| `<<updateChildActivity>>` | 更新孩子日常活动。 | 自定义孩子走注册的 `childActivity`。 |
| `<<pregnancyBabyText>>` | 输出 `baby/pup/chick` 一类称呼。 | 自定义种族走注册的 `text`。 |

`defaultBirthLocations()` 和 `giveBirthToChildren()` 是原版 `pregnancy.js` 里的闭包函数，框架不会直接替换。`birth` 当前是注册表/辅助数据，供模组事件或后续出生 UI 注入使用，不等于自动替换原版出生路径。

## 原版路线

原版 `human`、`wolf`、`wolfboy`、`wolfgirl`、`hawk`、`harpy` 仍然走原版逻辑。框架路线只处理会被原版过滤掉的自定义种族。
