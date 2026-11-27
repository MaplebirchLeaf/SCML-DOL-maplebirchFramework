# Face Style

`faceStyle` 用于扩展面部图片系统。框架会扫描所有已装模组 zip 中的 `img/face/...` 路径，把发现的风格（facestyle）与变体（facevariant）加入 `setup.faceStyleOptions` / `setup.faceVariantOptions`，供原版镜子和 NPC 侧边栏的 Face Style / Face Demeanour 选项使用。

---

## 目录结构

普通面部图层推荐按风格和变体放置：

```text
img/face/
  my-style/
    default/
      eyes.png
      mouth-smile.png
    sweet/
      eyes.png
```

- `<style>`: 风格（如 `my-style`、`default`）
- `<variant>`: 变体 / 仪态（如 `default`、`sweet`）

模组加载后，框架会遍历所有已装模组，扫描 `img/face/<style>/<variant>/<图>.png` 与 `img/face/<style>/<图>.png` 路径，并在 `:storyready` 和语言切换时建立风格与变体选项。`img/face/masks/` 目录会被跳过。`default` 风格下的内置变体（`aloof` / `catty` / `default` / `foxy` / `gloomy` / `sweet`）不会重复加入变体选项。

NPC 侧边栏的脸部图层按 `img/face/<facestyle>/<facevariant>/<图>.png`（或 `img/face/<facestyle>/<图>.png`）渲染。

> [!NOTE]
> 构建选项标签时，框架会通过 `maplebirch.auto(key)` 查找翻译（`default` 风格与变体分别映射到 `traditional` 与 `gentle`）。如果自定义风格或变体缺少翻译条目，则会直接回退显示目录名。

---

## 头部底图

如果某个面部风格需要替换头部底图，提供：

```text
img/face/<facestyle>/base-head.png
```

当当前 `facestyle` 下存在 `base-head.png` 时优先使用，否则回退到原版：

```text
img/body/base-head.png
```

`options.mannequin` 保持原版逻辑，不会走 faceStyle 头部底图：

```text
img/body/mannequin/base-head.png
```

> [!TIP]
> 渲染前如果当前 `facestyle` 或 `facevariant` 不在已注册选项中，框架会自动回退到 `'default'`，避免因卸载模组导致空脸或报错。

---

## 原版界面兼容

框架会补丁原版 `Widgets Mirror` / `Cheats` / `clothesTestingImageGenerate` / `Widgets Settings` 中 `setup.faceStyleOptions.length` 的数组长度判断（框架将 `faceStyleOptions` 从原版数组改为对象）。
