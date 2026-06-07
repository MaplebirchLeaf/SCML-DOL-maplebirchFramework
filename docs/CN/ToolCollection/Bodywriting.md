## 纹身注册

## 用来做什么

纹身注册用于向原版 `setup.bodywriting` 中添加新的身体文字或图案。适合添加模组剧情标记、身体装饰、特殊符号等内容。

框架会在合适的初始化时机把注册内容写入原版纹身数据。

---

## 使用入口

```javascript
maplebirch.tool.patch.addBodywriting(key, config);
```

---

## 最小写法

```javascript
maplebirch.tool.patch.addBodywriting('my_mod_mark', {
  writing: 'My Mark',
  writ_cn: '我的标记',
  type: 'text',
  gender: 'n',
  lewd: 0
});
```

`key` 是纹身的唯一标识，建议带模组名前缀。

---

## 配置字段

| 字段       | 说明                       | 默认值 |
| :--------- | :------------------------- | :----- |
| `writing`  | 英文名称                   | -      |
| `writ_cn`  | 中文名称                   | -      |
| `type`     | `text` 或 `object`         | `text` |
| `arrow`    | 是否带箭头标记，`0` 或 `1` | `0`    |
| `special`  | 特殊标记                   | `none` |
| `gender`   | 适用性别                   | `n`    |
| `lewd`     | 是否色情内容，`0` 或 `1`   | `0`    |
| `degree`   | 程度/强度                  | `0`    |
| `featSkip` | 是否跳过特征检查           | `true` |
| `sprites`  | 使用的精灵图名称数组       | -      |
| `index`    | 纹身索引，不填时自动生成   | 自动   |

`gender` 可用值：

| 值  | 说明 |
| :-- | :--- |
| `n` | 通用 |
| `f` | 女性 |
| `m` | 男性 |
| `h` | 双性 |

---

## 文本纹身

```javascript
maplebirch.tool.patch.addBodywriting('my_mod_rune_text', {
  writing: 'Rune',
  writ_cn: '符文',
  type: 'text',
  gender: 'n',
  degree: 1
});
```

---

## 图案纹身

```javascript
maplebirch.tool.patch.addBodywriting('my_mod_phoenix', {
  writing: 'Phoenix',
  writ_cn: '凤凰',
  type: 'object',
  gender: 'n',
  sprites: ['phoenix_left', 'phoenix_right'],
  degree: 3
});
```

`sprites` 中填写的名称需要与游戏/模组中实际使用的纹身图案资源对应。

---

## 条件或特殊内容

```javascript
maplebirch.tool.patch.addBodywriting('my_mod_magic_mark', {
  writing: 'Magic Mark',
  writ_cn: '魔法标记',
  type: 'text',
  special: 'magic',
  gender: 'n',
  lewd: 0,
  degree: 2
});
```

如果需要走原版特征检查，把 `featSkip` 设为 `false`：

```javascript
maplebirch.tool.patch.addBodywriting('my_mod_restricted_mark', {
  writing: 'Restricted Mark',
  writ_cn: '受限标记',
  featSkip: false
});
```

---

## 补充说明

- `key` 会写入配置对象，并用于 `setup.bodywriting_namebyindex` 映射。
- 未指定 `index` 时，框架会自动使用当前最大索引之后的值。
- 已存在相同 `key` 时，新配置会覆盖旧配置。

---

## boot.json

对象映射写法，推荐用于一次注册多个条目：

```json
{
  "framework": {
    "bodywriting": {
      "my_mod_rune_text": {
        "writing": "Rune",
        "writ_cn": "符文",
        "type": "text",
        "gender": "n",
        "degree": 1
      },
      "my_mod_phoenix": {
        "writing": "Phoenix",
        "writ_cn": "凤凰",
        "type": "object",
        "gender": "n",
        "sprites": ["phoenix_left", "phoenix_right"],
        "degree": 3
      }
    }
  }
}
```

也可以引用 `.json`、`.yaml` 或 `.yml` 文件：

```json
{
  "framework": {
    "bodywriting": "data/bodywriting.yaml"
  }
}
```

数组写法也支持，但每一项必须带 `key`：

```yaml
- key: my_mod_rune_text
  writing: Rune
  writ_cn: 符文
  type: text
  gender: n
  degree: 1
- key: my_mod_phoenix
  writing: Phoenix
  writ_cn: 凤凰
  type: object
  gender: n
  sprites:
    - phoenix_left
    - phoenix_right
  degree: 3
```
