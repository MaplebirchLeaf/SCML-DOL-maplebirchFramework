# 天气事件

开始下雨时记一条提示，雨停时收尾，可以分别放在天气事件的 `onEnter` 和 `onExit` 中。它们关注的是条件进入和退出的那一刻，适合处理随天气变化开始、结束的事情。

在加载脚本中登记事件后，框架会跟随天气系统的变化通知检查条件。它不按每分钟或每次页面重绘检查；只和时间、地点有关的逻辑，可以交给对应的时间或状态事件。

`maplebirch.dynamic.Weather` 还提供天气数据和渲染层的接入。它们和事件回调各有用途，后面会分别说明。

## 完整示例：雨天与雨停提示

**framework.js**

```javascript
function initWeatherNotice(variables) {
  variables.myMod ??= {};
  variables.myMod.weather ??= {};
  variables.myMod.weather.notice ??= ''; // 读档时保留尚未显示的提示。
}
maplebirch.tool.onInit(() => initWeatherNotice(V));
maplebirch.on(':onLoad', save => initWeatherNotice(save.V));

maplebirch.dynamic.regWeatherEvent('myMod:rainNotice', {
  // 雨属于 precipitation；name 是 clear、lightClouds 等天气类型。
  condition: () => Boolean(V.myMod?.weather) && Weather.precipitation === 'rain',
  onEnter: () => {
    V.myMod.weather.notice = 'rain';
  },
  onExit: () => {
    if (V.myMod?.weather) V.myMod.weather.notice = 'clear';
  }
});

// 每种状态对应一个输出 widget；先清掉标记，再输出固定内容。
for (const [state, widget] of [
  ['rain', 'myModRainBegins'],
  ['clear', 'myModRainEnds']
]) {
  maplebirch.dynamic.regStateEvent('gate', `myMod:weather:${state}`, {
    output: widget,
    cond: () => V.myMod?.weather?.notice === state,
    action: () => {
      V.myMod.weather.notice = '';
    },
    forceExit: false, // 显示提示后继续原页面。
    extra: { exclude: ['Start', 'Start2'] }
  });
}
```

**widgets.twee** — 加入 boot.json 的 `tweeFileList`。

```twine
:: My Mod Weather Notices [widget]
<<widget "myModRainBegins">>
  <span class="blue">雨点落了下来。</span><br><br>
<</widget>>

<<widget "myModRainEnds">>
  <span class="blue">雨渐渐停了。</span><br><br>
<</widget>>
```

结果：天气通知进入下雨状态后，下一个合适页面显示一次提示；持续下雨时不重复进入。重新启动或切换存档不恢复天气事件的运行时激活集合，因此不要把 onEnter 当成一次性奖励的凭证。下面保留单独测试、条件匹配及渲染扩展的示例。

## 1. 可直接登记的最小事件

把下面代码放在 `params.script` 加载的脚本中：

```javascript
maplebirch.dynamic.regWeatherEvent('myMod:rainyDay', {
  condition: () => Weather.precipitation === 'rain',
  onEnter: () => {
    maplebirch.log('雨天条件开始成立');
  },
  onExit: () => {
    maplebirch.log('雨天条件已不再成立');
  },
  priority: 5
});
```

先观察日志，就能看清事件何时进入、何时退出。即使加载时已经在下雨，第一次收到检查通知也会算作进入；登记本身还不会立刻调用回调。

| 连续两次检查    | 结果               |
| :-------------- | :----------------- |
| 不成立 → 成立   | 调用一次 `onEnter` |
| 成立 → 成立     | 不重复进入         |
| 成立 → 不成立   | 调用一次 `onExit`  |
| 不成立 → 不成立 | 不执行回调         |

ID 必须唯一，重复登记返回 `false`，不会覆盖已有事件。注销使用：

```javascript
maplebirch.dynamic.delWeatherEvent('myMod:rainyDay');
```

注销只移除事件及其运行时激活记录，**不会调用 `onExit`**。若进入时施加了效果，需要在主动注销前处理对应清理。

## 2. 冷夜条件：跨午夜要显式写出

再把条件写细一点：我们希望在秋冬的寒冷夜晚做些事情，只考虑晴天或多云、温度不高于 `5`，时间从晚上八点到次日六点之前。内置字段和 `condition` 可以一起把这个范围描述出来：

```javascript
maplebirch.dynamic.regWeatherEvent('myMod:coldNight', {
  weather: ['clear', 'lightClouds'],
  temp: {
    max: 5
  },
  season: ['winter', 'autumn'],
  condition: () => Time.hour >= 20 || Time.hour < 6,
  onEnter: () => {
    maplebirch.log('进入寒冷夜晚条件');
  },
  onExit: () => {
    maplebirch.log('离开寒冷夜晚条件');
  }
});
```

`{ min: 20, max: 6 }` 是普通闭区间，不能表示跨午夜。它要求同时不小于 `20` 且不大于 `6`，永远无法匹配正常小时。上例用 `||` 拆成两段，并明确排除 `06:00`。

检查由天气通知驱动。如果条件只依赖小时、任务或地点，需要确保该状态变化时有合适的检查机制；仅依赖天气事件不能保证恰在 `20:00` 执行。纯时间条件优先使用[时间事件](TimeEvents.md)，页面条件优先使用[状态事件](StateEvents.md)。

## 3. 匹配字段与配置

| 配置          | 含义                                       |
| :------------ | :----------------------------------------- |
| `condition()` | 无副作用的判断，省略时默认成立             |
| `onEnter()`   | 条件进入时同步执行                         |
| `onExit()`    | 条件退出时同步执行                         |
| `priority`    | 检查顺序从大到小，默认 `0`                 |
| `once`        | 首次进入后立即移除，之后不会再执行退出回调 |

内置字段：

| 字段                    | 读取来源                                  |
| :---------------------- | :---------------------------------------- |
| `weather`               | `Weather.name`                            |
| `temp`                  | `Weather.temperature`                     |
| `precip`                | `Weather.precipitation`                   |
| `season`、`hour`        | `Time.season`、`Time.hour`                |
| `dayState`              | `Weather.dayState`                        |
| `bloodMoon`、`freezing` | `Weather.bloodMoon`、`Weather.isFreezing` |
| `overcast`、`fog`       | `Weather.overcast`、`Weather.fog`         |

`weather` 使用原版天气类型名，例如 `clear`、`lightClouds`、`lightPrecipitation`。雨雪形态则使用 `precip` 或 `Weather.precipitation`，其值为 `none`、`rain` 或 `snow`。

普通值按严格相等匹配；数组表示其中任一值；`{ min, max }` 表示包含两端的范围，任一端可省略。额外字段会依次从 `V`、`T`、`Weather`、`Time` 查找同名属性，取第一个非 `undefined` 的值；不解析点分路径。

所有字段与 `condition` 都要成立。模组自己的嵌套状态建议直接写在 `condition` 中，例如 `V.myMod?.weatherQuest === 'active'`，不要为了匹配而把任务标记移到原版变量根级。

## 4. 激活状态与存档

事件的“上次是否成立”保存在运行时集合中，不随存档保存。重启后的第一次匹配可能再次进入；同一次运行切换存档时，该集合也不会自动恢复为目标存档的状态。

因此，需要当前是否下雨时直接查询 `Weather`。不要仅靠 `onEnter`／`onExit` 维护一个存档布尔值作为天气真值；它可能在读档后与运行时激活记录不一致。

如果天气会推进一次性任务，在模组自己的存档对象中保存任务完成标记，进入回调先检查该标记。`once: true` 只管本次运行，不能替代该存档标记，也不适合需要依靠 `onExit` 撤销的持续效果。

## 5. 修改渲染层与效果

接口如下，参数是当前底版实际使用的渲染层名、效果名及其字段：

```javascript
maplebirch.dynamic.Weather.addLayer(layerName, patch, 'merge');
maplebirch.dynamic.Weather.addEffect(effectName, patch, 'merge');
```

这是接口写法，`layerName`、`effectName`、`patch` 需要用核实过的配置替换。框架不定义通用的 `damageRate`、`particleColor`、`animation.speed` 或天气伤害系统；向对象写入这些自造字段，不代表原版渲染器或战斗系统会读取它们。

支持 `replace`（默认）、`merge`、`concat`，分别使用框架的覆盖、合并、追加工具。这些模式修改匹配的原版层／效果对象；`replace` 不表示重新创建整个原版渲染器。

通过推荐的 `script` 提前登记。框架在渲染层创建时应用并消费匹配的层修改；效果修改在原版效果表中查找对应对象，处理后清空队列。缺失的效果不会因为这段配置自动创建；渲染层已创建后再登记，也不保证立刻回改已有层。

## 6. 自定义天气与特定日期例外

两种数据都用 `maplebirch.dynamic.addWeather(data)`，但结构不同：

| 数据     | 必需内容                                                                                                                                  | 接入位置                               |
| :------- | :---------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------- |
| 天气类型 | `name`、`value`、四季 `probability`、`cloudCount.small/large` 函数、`tanningModifier`、`overcast`、`precipitationIntensity`、`visibility` | `setup.WeatherGeneration.weatherTypes` |
| 日期例外 | 返回日期的 `date()`、`duration`、已有的 `weatherType`，可选 `temperature`                                                                 | `setup.WeatherExceptions`              |

类型还可提供 `iconType`。各字段的单位、合法值和资源名沿用目标版本的原版天气生成与渲染实现。配置一个新天气名不会自动提供图标、粒子、音效或伤害；准备完整资源并核对底版字段后再接入。

数据应在脚本加载时登记，初始化阶段才写入原版配置。同名天气类型不会重复加入；日期例外追加到列表。返回的 `true` 或 `undefined` 反映登记类型，不表示天气已发生。当前运行中初始化完成后再登记，不会自动重新初始化。

## 验证流程

先用日志事件检查“不成立 → 成立 → 继续成立 → 退出”，确认各只执行一次。再检查首次加载时已成立、读档、重启、注销、`once`，以及跨午夜条件。涉及渲染时，另行核对目标层／效果确实存在且原版实际读取修改字段。

[开发流程](../Development.md) · [时间事件](TimeEvents.md) · [状态事件](StateEvents.md)
