##### (v.2.73更新日志):

+ 修复优化了 **`作弊集`** 详情见 [**秋枫白桦扩展**](https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchExpansion)
+ 优化重构了npc侧边栏(还在制作更新)
+ 优化了在 **`boot.js`** 提供的js注册方式
+ 优化升级了 **`<<radiobuttonsfrom>>`** 宏
+ 提供了修改侧边栏 **`main画布`** 的功能
+ 修复并重新使 **`转化添加`** 可修改角色画布
+ 修复了 **`转化管理`** 中特殊转化的升级方式
+ 在 **`NPC侧绘`** 中支持日晒功能
+ 删除专有的 **npc模型** 画布
+ 优化部分css
+ 修复转化中图标以及getter属性问题

##### (v.2.71更新日志):

+ 修复 `Degrees-of-Lewdity-v0.5.7.x` 转化的损坏，临时删除转化对侧边栏画布的注册
+ 重构 **`转化管理`** 中模组转化的注册方式，不再要求需要 `widget` 宏
+ 将 **`侧边栏控件`**、**`作弊集`**、**`衣柜搜索`**、**`内置音乐盒`**、**`日蚀天气`** 功能搬去了[**秋枫白桦扩展**](https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchExpansion)
+ 为框架提供 **`boot.js`** 中专用的js注册方式
+ 优化 `角色面板` 以待后续更新
+ 删除 `调试模式` 功能
+ 修复 `Degrees-of-Lewdity-v0.5.7.x` 设置中 npc 显示问题
+ 新增 **`combat`** 在遭遇战中添加 `Seepch` 对话功能
+ 修复 `<<maplebirchReplace>>` 的部分错误
+ 优化整体逻辑

##### (v2.64更新日志):

+ 优化 `<<lanButton>>` 、`<<lanSwitch>>`、`<<lanLink>>`、`<<lanListbox>>`等宏，使其支持`class`与`style`的添加
+ 修复 **模组添加转化** 后再卸载添加转化的模组时的数据错误保留
+ 将 `音频播放器` 重新在框架中内置
+ 优化 `isPossibleLoveInterest` 函数，使其支持新NPC的条件支持，默认为 `V.(npc名字小写)Seen.includes('romance')`
+ 重构 语言切换 的逻辑
+ 优化 `作弊集` 和 `代码作弊器` 的UI
+ 修复 `lanSwitch` 函数的错误
+ 在衣柜中添加的搜索功能

##### (v2.63更新日志):

+ 优化 `双性及变装` 的注册逻辑
+ 修复`NPC注册`怀孕相关逻辑
+ 修复`转化管理`的每日衰变逻辑，提供兼容接口
+ 添加为 **遭遇战斗** 中加入 **模组动作选项** 的功能
+ 优化 `<<langlink>>` 等宏命名，使其与 `<<lanSwitch>>` 结构一致，为 `<<lanLink>>`
+ 将`yaml解析库`转为本地，杜绝在非联网状态下无法解析的问题
+ 删除 `JavaScript作弊控制台` 的权限分类功能，直接为 `window权限`

##### (v2.61更新日志):

+ 删除 `V.maplebirch.combat.npclist` 相关生成逻辑在 `NPCspawn` 中
+ 修改原版双性以及变装检测，需要在场NPC都知道PC性别才不触发
+ 提供了一定便携的 PC `双性` 及 `变装` 时NPC战斗的对话文本接口
+ 提供了NPC战斗射精文本便携注册，只需要处于 `setup.NPCNameList` 名单中且有对应的 `<<ejaculation-(npc名称小写)>>` 宏即可
+ 将 `言灵作弊集存储`、`音频存储`、`多语言存储` 的IDB转为统一数据库
+ 优化了部分工具函数

##### (v2.60更新日志):

+ 修复 `原版0.5.6.10` 相关设置变动问题
+ 新增与 `简易框架` 同时加载时 **禁用** `简易框架` 的功能

##### (v2.59更新日志):
+ 优化重构了 `NPC模块` 的NPC创建方式，现在新增模组npc为实例，并拥有其它属性(**注册方式兼容就方法**)。
+ 迁移了 注册NPC 原版服装库的函数位置
+ 新增了 **`NPC日程表`** 的注册和修改，多用于模组NPC
+ 更新兼容了原版 **`0.5.6.10`** 的转化
+ 优化修改了 **`变量迁徙`** 功能
+ 优化重构了 **`可控随机数`** 功能
+ 优化了 **`链接区域管理工具`**
+ 将 `:defineWidget` 改为 `:defineSugarcube`
+ 将 `日食` 发生的时间改为了固定可预测值
+ 修复 `random` 函数 `max` 时无法随机最大值的错误
+ 修复 `NPC模块` 无法修改原版NPC 属性的错误
+ 移除 `V.NPCName` 在 `NPC模块` 的存储
+ 优化 `V.maplebirch.npc` 逻辑，将会自动清理已卸载模组npc的数据

##### (v2.58更新日志):

+ 优化了定制涂鸦，可用颜色代码自选颜色
+ 优化了时间事件，使其兼容简易框架的写法

##### (v2.57更新日志):
<details><summary>点击查看图片</summary>
<img width="1167" height="1026" alt="image" src="https://github.com/user-attachments/assets/5a8121df-b282-4fa5-a92c-e9aa5b81b32d" /></details>

+ 添加了 **`setup.bodywriting`** 纹身涂鸦的添加方法
+ 修复了 **`NPC模块`** 中的服装问题与初始化问题
+ 优化了 **调试模式** 的使用体验
+ 优化了 **`<<radiobuttonsfrom>>`** 宏的使用，使其支持简便数组
+ 修复了 **`<<langlistbox>>`** 宏的 **`optionsfrom`** 使用方式
+ 修复了 **`NPC模块`** important等函数的不支持错误，以及addStats的描述错误
+ 优化了 **`maplebirch.tool.text.replaceText`** 的使用，使其匹配所有相关项
+ 修复了 **状态事件** 的触发错误
+ 新增了 **定制涂鸦** 功能在镜子处

##### (v2.56更新日志):
<details><summary>点击查看图片</summary>
<img width="1152" height="382" alt="image" src="https://github.com/user-attachments/assets/ea5b872c-0f4e-4449-9151-5f4509ae92aa" /></details>

+ 在侧边栏控件中的 **模组内容** 中添加了言灵作弊集(为跨存档作弊集，不会随存档迁徙)
+ 添加了 **`maplebirch.tool.text.replcaeText`** 与 **`maplebirch.tool.text.replcaeLink`** 便于页面渲染后动态替换修改当前页面文本或链接
+ 优化了 **音频管理** 模块，将主体数据转移至 idb存储 中
+ 在模组设置添加了自行选择 **社交栏NPC状态** 的显示数目
+ 兼容了 0.5.6.10 的i18n汉化以及游戏版本
+ 修复极容易出现超多 `maplebirchMonitor` 的弹窗警告问题

##### (v2.53更新日志):

+ 更新优化了npc注册，当未选择性别时随机选择
+ 添加了原版npc服装库添加方法
+ 添加了 `<<language>>` 宏
+ 优化了`state`和`framework`的初始化时机，使其提前至`inject_early`
+ 添加了为原版增加转化的方法
+ 优化侧边栏位置按钮，使其可以记住上次所在标题
+ 优化音频包模组

##### (v2.52更新日志):
<details><summary>点击查看图片</summary>
<img width="1152" height="342" alt="image" src="https://github.com/user-attachments/assets/db4559d2-8056-4dcd-bed6-7b3ddfc5e068" /></details>

+ 在 `addto` 区域添加了 `知名度修改区` 和 `声誉修改区` 
+ 为游戏内的天空盒效果和图层的修改与添加提供了较为便利写法
+ 优化了日食的实现写法
+ 优化更新了 `merge` 工具函数，不影响原来的使用

+ `<<langbutton>>` 与 `<<langlink>>` 宏的优化，使其完全覆盖 `<<link>>` 与 `<<button>>` 宏的功能




