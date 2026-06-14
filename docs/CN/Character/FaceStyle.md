# Face Style

`faceStyle` 用于扩展原版 PC 面部图片。框架会扫描模组图片路径，并把 `img/face/...` 下的风格加入镜子与相关模型选项。

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

`faceStyleSrcFn()` 的常规查找顺序是：

1. `img/face/<当前风格>/<当前变体>/<图层名>.png`
2. `img/face/<当前风格>/<图层名>.png`
3. `img/face/default/<当前变体>/<图层名>.png`
4. `img/face/default/<图层名>.png`

框架会通过原版图片加载流程检查路径，因此本地 `img` 文件夹与 BSA/IDB 中的模组图片都可以被使用。

---

## 头部底图

从 4.1.3 起，`basehead` 也可以跟随 `faceStyle` 替换。

如果某个面部风格需要替换头部底图，只需要提供：

```text
img/face/<facestyle>/basehead.png
```

例如：

```text
img/face/my-style/basehead.png
```

当当前 `facestyle` 下存在 `basehead.png` 时，框架会优先使用它；否则回退到原版：

```text
img/body/basehead.png
```

`options.mannequin` 仍保持原版逻辑，不会走 faceStyle 头部底图：

```text
img/body/mannequin/basehead.png
```

---

## 示例

```text
img/
  face/
    author-style/
      basehead.png
      default/
        eyes.png
        sclera.png
        iris.png
        mouth-smile.png
```

`basehead.png` 放在风格根目录，不放在 `default/` 变体目录里。
