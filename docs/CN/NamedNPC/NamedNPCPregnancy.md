# NPC 怀孕

NPC 怀孕是接入原版怀孕系统的桥。它不会把一个种族伪装成另一个种族，而是让新种族拥有自己的精液记录、受孕生成、周期推进、出生地点、孩子活动、宝宝称呼和转化数据。

这个系统是双向的：

- NPC 可以让 PC 怀孕。
- PC 也可以让 NPC 怀孕。

同一个怀孕种族和同一个生成器会同时服务这两个方向。

## 两层模型

怀孕注册分为两层：

- `addPregnancy(type, config)` 注册怀孕种族。种族决定生成器、剩余天数、出生地点默认值、孩子配置、称呼和转化。
- `maplebirch.npc.Pregnancy.addNpc(npcName, type, config)` 注册单个 NPC。NPC 决定这个角色是否参与怀孕系统、使用哪个怀孕种族、是否能怀孕或让 PC 怀孕，以及是否覆盖周期和出生地点。

这两层是分开的。一个种族可以被多个 NPC 使用；一个 NPC 也可以使用和自己 `npc.type` 不同的怀孕种族。

## NPC 数据

新增 NPC 可以在注册 NPC 时直接启用 `pregnancy.enabled`。`pregnancy.type` 是精液记录和怀孕生成时使用的怀孕种族。

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

原版 NPC 不需要重新 `maplebirch.npc.add()`，可以用 `maplebirch.npc.Pregnancy.addNpc()` 单独接入。

## 添加种族

只添加种族名时，框架会在怀孕过滤中保留这个类型，但不会凭空生成怀孕数据。

```javascript
maplebirch.npc.addPregnancy('plant');
```

完整注册通常需要 `generator`：

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

  child: {
    defaults: {
      nursery: 'planter'
    },
    transform: 'plant',
    activity(childId, child) {
      return random(0, 1) ? 'sleeping' : 'sprouting';
    },
    text: {
      single: 'seedling',
      multiple: 'seedlings'
    }
  }
});
```

## 单个 NPC 配置

当某个原版或新增 NPC 需要进入怀孕系统时，使用 `maplebirch.npc.Pregnancy.addNpc()`。

```javascript
maplebirch.npc.Pregnancy.addNpc('Some NPC', 'human', {
  canBePregnant: true,
  canImpregnatePlayer: false,
  multiplier: 1.5,
  birth: {
    birthLocation: 'home',
    location: 'home'
  },
  cycleMode: 'after',
  onMissedBirth(npcName, pregnancy) {
    pregnancy.missedBirth = true;
    pregnancy.missedBirthCount = (pregnancy.missedBirthCount || 0) + 1;
  }
});
```

如果 NPC 本身的 `pregnancy.type` 已经写好了，也可以只传配置：

```javascript
maplebirch.npc.Pregnancy.addNpc('Some NPC', {
  type: 'plant',
  canBePregnant: true
});
```

也可以写在种族注册的 `npc` 字段里：

```javascript
maplebirch.npc.addPregnancy('plant', {
  generator,
  npc: {
    'Some NPC': {
      multiplier: 1.5
    }
  }
});
```

## 注册字段

| 字段 | 类型 | 作用 |
| :--- | :--- | :--- |
| `generator` | `(mother, father, fatherKnown, genital) => pregnancy` | 生成怀孕数据，并安装到 `window.pregnancyGenerator[type]`。 |
| `birth` | 对象或 `(type, pregnancy, npcName) => object` | 注册种族或单个 NPC 的默认出生地点和孩子地点。 |
| `type` | 字符串 | 仅 NPC 配置使用，指定这个 NPC 使用的怀孕种族。 |
| `enabled` | 布尔值 | 仅 NPC 配置使用，设为 `false` 时只保存覆盖配置，不自动加入可怀孕名单。 |
| `canBePregnant` | 布尔值 | 仅 NPC 配置使用，是否把这个 NPC 加入 `setup.pregnancy.canBePregnant`。 |
| `canImpregnatePlayer` | 布尔值 | 仅 NPC 配置使用，是否把这个 NPC 加入 `setup.pregnancy.canImpregnatePlayer`。 |
| `multiplier` | 数字或 `(npcName, pregnancy) => number` | 每日怀孕计时增长倍率。 |
| `autoEnd` | 布尔值或 `(npcName, pregnancy) => boolean` | 是否在错过分娩事件后自动结束怀孕。 |
| `cycleMode` | `'range'` 或 `'after'` | 排卵危险日检查模式。 |
| `forcePregnancy` | 布尔值或 `(npcName, pregnancy) => boolean` | 随机未抽中时，是否强制使用第一份可用精液。 |
| `nonCycleFlag` | 字符串 | 非周期 RNG 成功时写入怀孕对象的字段名。 |
| `onMissedBirth` | `(npcName, pregnancy) => void` | 自动处理错过分娩前执行的回调。 |
| `npc` | `Record<npcName, config>` | 写在种族配置里的单个 NPC 覆盖配置。 |
| `eta` | `(pregnancy) => number \| null` | 覆盖这个种族的 `window.pregnancyDaysEta()` 显示。 |
| `child` | 对象 | 注册孩子出生后的默认字段、转化、日常活动和宝宝称呼。 |
| `childActivity` | `(childId, child) => string \| null \| false \| void` | 旧式写法，等同于 `child.activity`。 |
| `text` | 对象或 `(pregnancy, count, target) => string` | 旧式写法，等同于 `child.text`。 |

## 孩子配置

如果种族生成器已经由其它脚本注册，只想补孩子出生后的字段、转化或活动，可以使用 `maplebirch.npc.Pregnancy.addChild()`。

```javascript
maplebirch.npc.Pregnancy.addChild('plant', {
  defaults: {
    nursery: 'planter'
  },
  transform: 'plant',
  activity(childId, child) {
    return child.location === 'forest' ? 'sprouting' : 'sleeping';
  },
  text: {
    single: 'seedling',
    multiple: 'seedlings'
  }
});
```

### `child.defaults`

`child.defaults` 会在原版 `<<endNpcPregnancy>>` 创建 `V.children[childId]` 之后执行。它可以是普通对象，也可以是函数。

```javascript
child: {
  defaults(child, pregnancy, npcName) {
    return {
      nursery: child.mother === 'pc' ? 'home' : 'forest',
      plantStage: 0
    };
  }
}
```

### `child.transform`

`child.transform` 用于兼容原版和框架新增转化。原版孩子特征存在 `child.features` 中，框架会在出生后写入这些字段。

```javascript
child: {
  transform: {
    animal: 'wolf',
    divine: 'angel',
    maplebirch: 'plant'
  }
}
```

| 字段 | 写入位置 | 用途 |
| :--- | :--- | :--- |
| `animal` | `child.features.beastTransform` | 动物转化标记。值可以是原版动物转化名，也可以是框架新增的物理/动物转化名。 |
| `divine` | `child.features.divineTransform` | 神圣转化标记。值可以是原版神圣/恶魔转化名，也可以是框架新增的神圣转化名。 |
| `features` | `child.features` | 直接补充任意原版兼容 feature 字段。 |
| `maplebirch` | `child.features.maplebirchTransform` | 给框架或模组自定义转化保存标记。 |

## 运行流程

```mermaid
flowchart TD
  A["模组注册 addPregnancy(type)"] --> B["种族注册表"]
  C["模组注册 Pregnancy.addNpc(npcName, type)"] --> D["NPC 覆盖注册表"]
  E["NPC 初始化 / 读档"] --> F["definePregnancyProperty 懒初始化 pregnancy"]
  F --> G["savedPregnancy 写入 setup.pregnancy 类型与 NPC 名单"]
  H["事件或战斗 recordSperm"] --> I["框架补 spermType 后交回原版 recordSperm"]
  I --> J["playerPregnancyAttempt / namedNpcPregnancy"]
  J --> K["自定义种族走 window.pregnancyGenerator[type]"]
  K --> L["写入 PC 或 NPC pregnancy.fetus"]
  M["time.js 每日 NPC 周期"] --> N["maplebirch.npc.Pregnancy.cycle()"]
  N --> O["推进 NPC pregnancy.timer / cycleDay"]
  O --> P["到期时调用原版 endNpcPregnancy 宏"]
  P --> Q["原版 giveBirthToChildren 写入 V.children"]
  Q --> R["框架应用 child.defaults / child.transform"]
```

## 原版修改点

| 原版入口 | 框架处理 |
| :--- | :--- |
| `time.js` 每日 `npcPregnancyCycle()` | 替换为 `maplebirch.npc.Pregnancy.cycle()`。 |
| `window.pregnancyGenerator` | 注入自定义种族生成器。 |
| `window.recordSperm` | 先给自定义命名 NPC 补齐 `spermType`，再交回原版。 |
| `<<playerPregnancyAttempt>>` | 自定义精液走框架，原版种族回退原版宏。 |
| `<<namedNpcPregnancy>>` | 自定义母体/父方组合走框架，原版组合回退原版宏。 |
| `<<endNpcPregnancy>>` | 先解析注册出生地点，交回原版出生，之后应用 child 配置。 |
| `window.pregnancyDaysEta()` | 自定义种族走注册 `eta`，否则回退原版。 |
| `<<updateChildActivity>>` | 自定义孩子走 `child.activity`，否则回退原版。 |
| `<<pregnancyBabyText>>` | 自定义种族走 `child.text`，否则回退原版。 |
