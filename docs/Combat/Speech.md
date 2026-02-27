## 战斗对话

### 基本介绍

战斗对话系统允许模组制作者为 NPC 注册在战斗中触发的特殊对话。每个对话可以设置触发条件和冷却时间，确保对话不会频繁重复。
_可通过 `maplebirch.combat.Speech` 访问战斗对话功能。_

---

### 注册战斗对话

#### 基本语法

```javascript
// 注册单个战斗对话
maplebirch.combat.Speech.reg(
  'Luna',
  // 条件函数
  () => V.player.health < 30,
  // 对话内容
  '“你看起来伤得很重，需要帮忙吗？”',
  // 冷却时间(回合数)
  3
);

// 注册多个战斗对话
maplebirch.combat.Speech.reg('Draven', () => V.combatTurn === 1, '“让我们速战速决吧！”', 5);

maplebirch.combat.Speech.reg('Draven', () => V.player.attackCount >= 3, '“你打得不错，但还不够好！”', 2);
```

#### 方法签名

```javascript
reg(
  npc: string,           // NPC名称
  cond: () => boolean,   // 触发条件函数
  speech: string,        // 对话内容
  cd: number            // 冷却时间(回合数)
): void
```

---

### 基本战斗对话

```javascript
// 注册基于血量的对话
maplebirch.combat.Speech.reg('Merlin', () => V.player.health < 20, '“看来你需要一些治疗法术！”', 4);

// 注册基于回合数的对话
maplebirch.combat.Speech.reg('Elara', () => V.combatTurn === 3, '“战斗已经持续了三回合，让我们结束它吧！”', 6);

// 注册基于状态的对话
maplebirch.combat.Speech.reg('DarkKnight', () => V.player.status?.poisoned, '“毒药正在侵蚀你的身体，放弃吧！”', 3);
```

#### 条件复杂的对话

```javascript
// 多重条件组合
maplebirch.combat.Speech.reg(
  'MysteriousMage',
  () => {
    // 只在夜晚战斗
    if (Time.hour < 18 && Time.hour > 6) return false;
    // 需要玩家有魔法值
    if (!V.player.mana || V.player.mana < 10) return false;
    // 战斗中至少有一个敌人
    if (!V.NPCList || V.NPCList.length === 0) return false;
    return true;
  },
  '“月光下的魔法对决，多么美妙！”',
  5
);

// 基于NPC自身状态的对话
maplebirch.combat.Speech.reg(
  'VampireLord',
  () => {
    const healthPercent = C.npc.VampireLord?.health / C.npc.VampireLord?.maxHealth || 1;
    // 血量低于30%时触发
    if (healthPercent > 0.3) return false;
    // 只在满月时触发
    if (!V.fullMoon) return false;
    return true;
  },
  '“月圆之夜，我的力量达到巅峰！”',
  10
);
```

#### 动态对话内容

```javascript
// 使用函数生成动态对话
maplebirch.combat.Speech.reg(
  'TavernBrawler',
  () => V.player.drunkenness >= 50,
  () => {
    const insults = ['“你喝多了吧，站都站不稳！”', '“酒鬼也想打架？”', '“需要再来一杯壮胆吗？”'];
    return _.sample(insults);
  },
  2
);

// 包含变量的对话
maplebirch.combat.Speech.reg(
  'GoblinChief',
  () => V.combatTurn % 5 === 0,
  () => {
    const remaining = V.NPCList.length;
    return `“我还有${remaining}个手下，你赢不了的！”`;
  },
  5
);

// 多语言对话
maplebirch.combat.Speech.reg(
  'ElvenGuard',
  () => V.player.race === 'human',
  () => {
    if (maplebirch.Language === 'CN') {
      return '“人类，你不该踏足精灵的领地！”';
    } else {
      return '“Human, you should not trespass on elven lands!”';
    }
  },
  4
);
```

### 射精对话 (Ejaculation)

#### 基本介绍

射精对话系统通过定义特定格式的宏来实现 NPC 射精时的特殊对话。

#### 注册射精对话

射精对话通过定义特定名称的 SugarCube 宏来实现。宏名称必须为 `ejaculation-<npcName>`，其中 `<npcName>` 为 NPC 名称(小写)。

##### 基本语法

```javascript
// 在段落中定义宏
<<widget "ejaculation-luna">>
  <<if _args.length>>
    露娜<<print _args[0]>>射精了。
  <<else>>
    露娜射精了。
  <</if>>
<</widget>>
// 在 JavaScript 中定义宏
Macro.add('ejaculation-merlin', {
  handler() {
  const output = this.args[0] ? ${this.args[0]}: '';
    return 梅林法师${output}射精了。;
  }
});
```

### 在游戏中使用

系统会自动检测 NPC 是否有对应的射精对话宏。如果没有，则使用默认对话。

### 注意事项

1. 宏名称必须为 `ejaculation-<npcName>` 格式
2. NPC 名称必须小写
3. 宏可以接受一个可选参数，用于描述射精的上下文
4. 如果 NPC 没有定义射精对话，则使用游戏默认处理
