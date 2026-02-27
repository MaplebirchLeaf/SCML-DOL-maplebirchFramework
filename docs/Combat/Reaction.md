## 异装和双性对话

### 基本介绍

异装和双性对话系统允许模组制作者为 NPC 添加看到玩家异装(crossdress)或双性(herm)特征时的特殊反应对话。这些反应会在特定条件下触发，每个 NPC 对每种类型只能触发一次。
_可通过 `maplebirch.combat.Reaction` 访问反应对话功能。_

---

### 注册反应对话

#### 基本语法

```javascript
// 注册单个反应
maplebirch.combat.Reaction.regReaction('herm', 'Luna', {
  texts: {
    CN: {
      s: '单人文本(NPC数量为1时)',
      m: '多人文本(NPC数量>1时)'
    },
    EN: {
      s: 'Single text (when 1 NPC)',
      m: 'Multiple text (when >1 NPC)'
    }
  },
  before: '<<run someSetup()>>',
  affter: '<<set $lunaArousal += 20>>'
});

// 使用函数动态生成文本
maplebirch.combat.Reaction.regReaction('crossdress', 'Draven', {
  texts: (lang, single) => {
    if (lang === 'CN') {
      return single ? '单人文本' : '多人文本';
    } else {
      return single ? 'Single text' : 'Multiple text';
    }
  },
  affter: () => (V.player.charisma >= 15 ? '<<set $dravenIntrigued = true>>' : '<<set $dravenDisgusted = true>>')
});
```

#### 配置结构

```javascript
{
  texts: TextsType,                    // 必须：对话文本
  before?: string | (() => string),    // 可选：触发前执行的内容
  affter?: string | (() => string)     // 可选：触发后执行的内容
}
```

#### 低层注册 API

```javascript
// 使用 reg 方法直接注册(更灵活，但更复杂)
maplebirch.combat.Reaction.reg(
  'herm',
  'CustomNPC',
  // 条件函数
  () => {
    return V.player.isHerm && !V.customnpcSeen.includes('herm') && V.encounterType === 'special';
  },
  // 动作函数
  () => {
    V.customnpcSeen.pushUnique('herm');
    return `<<set $customnpcArousal += 25>><<set $speechhermaroused to 2>><span class="purple">自定义NPC对你的双性特征表现出浓厚兴趣。</span>`;
  }
);
```

---

### 注册自定义 NPC 反应

```javascript
// 双性特征反应
maplebirch.combat.Reaction.regReaction('herm', 'Merlin', {
  before: '<<run checkMerlinKnowledge()>>',
  texts: {
    CN: {
      s: '<<He>>仔细观察你的双性特征，眼中闪烁着好奇的光芒。"有趣的魔法变异，"<<he>>喃喃自语。',
      m: '梅林仔细观察你的双性特征，眼中闪烁着好奇的光芒。"有趣的魔法变异，"梅林喃喃自语。'
    },
    EN: {
      s: '<<He>> carefully examines your herm features, curiosity shining in <<his>> eyes. "Interesting magical mutation," <<he>> murmurs.',
      m: 'Merlin carefully examines your herm features, curiosity shining in <<nnpc_his "Merlin">> eyes. "Interesting magical mutation," <<nnpc_he "Merlin">> murmurs.'
    }
  },
  affter: '<<set $merlinResearchInterest += 30>><<set $speechhermaroused to 3>>'
});
```

#### 复杂条件反应

```javascript
// 基于多种游戏状态的复杂反应
maplebirch.combat.Reaction.regReaction('herm', 'MysteriousStranger', {
  before: () => {
    V._strangerMood = determineStrangerMood();
    V._playerReputation = getPlayerReputation();
    return '';
  },
  texts: (lang, single) => {
    const mood = V._strangerMood;
    const rep = V._playerReputation;

    if (lang === 'CN') {
      if (mood === 'hostile') {
        return single ? '<<He>>厌恶地看着你的双性特征。"怪物！"' : '神秘陌生人厌恶地看着你的双性特征。"怪物！"';
      } else if (mood === 'curious' && rep >= 50) {
        return single ? '<<He>>饶有兴趣地观察着。"我从没见过这样的变异...可以让我研究一下吗？"' : '神秘陌生人饶有兴趣地观察着。"我从没见过这样的变异...可以让我研究一下吗？"';
      } else {
        return single ? '<<He>>微微睁大眼睛，但很快恢复了平静。' : '神秘陌生人微微睁大眼睛，但很快恢复了平静。';
      }
    } else {
      if (mood === 'hostile') {
        return single ? '<<He>> looks at your herm features with disgust. "Monster!"' : 'The mysterious stranger looks at your herm features with disgust. "Monster!"';
      } else if (mood === 'curious' && rep >= 50) {
        return single ? '<<He>> observes with keen interest. "I've never seen a mutation like this... may I study it?"' : 'The mysterious stranger observes with keen interest. "I've never seen a mutation like this... may I study it?"';
      } else {
        return single ? '<<He>>'s eyes widen slightly, but <<he>> quickly regains composure.' : 'The mysterious stranger's eyes widen slightly, but <<nnpc_he "MysteriousStranger">> quickly regains composure.';
      }
    }
  },
  affter: () => {
    const mood = V._strangerMood;
    if (mood === 'hostile') {
      return '<<set $enemyanger += 50>><<set $strangerHostile = true>>';
    } else if (mood === 'curious') {
      return '<<set $strangerResearch = true>><<set $speechhermaroused to 4>>';
    }
    return '<<set $speechhermnoted to 1>>';
  }
});
```

---

### 完整示例

```javascript
// 注册精灵NPC的双性反应
maplebirch.combat.Reaction.regReaction('herm', 'ElvenQueen', {
  before: '<<set _queenMood = V.elfReputation >= 50 ? "accepting" : "disdainful">>',
  texts: (lang, single) => {
    const mood = V._queenMood;

    if (lang === 'CN') {
      if (mood === 'accepting') {
        return single ? '精灵女王好奇地看着你的双性特征。"自然界的奇妙变异，"她微笑着说。' : '精灵女王好奇地看着你的双性特征。"自然界的奇妙变异，"她微笑着说。';
      } else {
        return single ? '精灵女王轻蔑地瞥了一眼。"畸形，"她冷冷地说。' : '精灵女王轻蔑地瞥了一眼。"畸形，"她冷冷地说。';
      }
    } else {
      if (mood === 'accepting') {
        return single
          ? 'The Elven Queen looks curiously at your herm features. "A fascinating mutation of nature," she says with a smile.'
          : 'The Elven Queen looks curiously at your herm features. "A fascinating mutation of nature," she says with a smile.';
      } else {
        return single ? 'The Elven Queen glances dismissively. "Malformation," she says coldly.' : 'The Elven Queen glances dismissively. "Malformation," she says coldly.';
      }
    }
  },
  affter: () => {
    if (V._queenMood === 'accepting') {
      return '<<set $elfReputation += 10>><<set $speechhermaroused to 2>>';
    } else {
      return '<<set $elfReputation -= 20>><<set $queenDispleased = true>>';
    }
  }
});
```
