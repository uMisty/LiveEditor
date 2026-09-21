# Thus.Live 桌面编辑器 · 交互规范 v1.0

[Figma 设计文件](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS)

42 个页面与关键状态，三平台共用交互规范。原型展示固定状态，不执行真实文件操作。

## 00 / 交付范围与阅读方式

### 目标

为 Thus.Live 提供 macOS、Windows、Linux 桌面博文编辑体验。已确认的信息架构为固定导航、独立文章列表和专注写作。本文档与 S01–S42 页面编号对应。

### 原型入口

起点 1：S01 连接项目 → S02 检测完成 → S05 文章库。
起点 2：S05 查找文章 → S11 分栏写作 → S14 元信息 → 保存。
起点 3：S11 编辑 → 图片、预览、设置；错误状态通过规范索引直达。

### 原型边界

页面和控件是可编辑 Figma 图层与组件实例。热点演示固定状态跳转，不模拟真实文件选择、文本编辑或磁盘写入。点击字段进入的冲突示例是演示入口，正式产品只在校验失败时触发。

### 首版范围

项目连接、文章库、搜索筛选、新建、元信息、Markdown 编辑、项目样式与扩展语法预览、图片、文件操作、保存和恢复。部署、Git 操作和 AI 写作不在首版范围。

## 01 / 项目连接与启动

### S01 → S40 → S02 / 选择目录

首次启动只提供选择文件夹与粘贴绝对路径。选择后禁用重复提交并显示“正在检查项目…”；可取消。只读检查路径、content/posts、样式文件和渲染配置。通过后启用“进入写作空间”。

### S03 / 不可访问

目录不存在、被移动或无读取权限时显示具体原因及重试/重新选择。不得自动新建文章目录。无项目特征时显示“请选择 Thus.Live 根目录”。

### S04 / 空项目

有效项目中没有文章时进入空文章库，主操作是新建第一篇草稿。路径有效但样式缺失时允许用户明确选择基础预览，持续显示降级标识。

### 再次启动

应用配置记住最近目录、窗口布局和列表筛选。恢复上次项目，恢复副本先进入 S25。切换项目有未保存内容时先走 S22。原生目录选择器遵循操作系统。

## 02 / 文章查找、排序和筛选

### S05 / 全部文章

固定导航不列文章，也不展开年月树。列表默认按最近修改排序；可切换发布日期。单击选择并展示概览，双击或“开始写作”进入 S11。数量为索引结果，不等于已部署篇数。

### S06 / 搜索与 S10 / 无结果

按标题、文件名、标签匹配，输入后 200ms 更新；输入法合成期间不提交。关键词和筛选取交集。加载状态保留上次结果并显示正在搜索；无结果提供清除筛选。

### S07 / S37 归档与 S08 / S38 标签

归档通过年份和月份选择筛选；年份只列有文章的年份，月份显示篇数。选择年份后月份重置为全部。标签可多选并注明“匹配任意所选标签”，删除标签条件不会删除文章标签。

### S09 / 草稿

仅显示 draft: true。非草稿表示参与下次构建，不宣称已上线。列表按需虚拟滚动；返回查找时恢复选中项、筛选、排序与滚动位置。

## 03 / 写作、预览与快速打开

### S11 / 分栏

进入写作时收起文章列表。左右默认各占可用空间的一半，拖拽分隔线可调整；最窄分栏 400px。正文从内存缓冲区预览，草稿不需要改为非草稿。

### S12 / 写作、S13 / 预览

切换视图不写文件、不丢光标和滚动位置。纯写作与完整预览采用居中的阅读宽度。宽度不足时默认单栏，仍可通过顶部切换预览。

### 实时渲染

输入结束 250ms 后启动最新渲染任务；旧任务结果不得覆盖新任务。同步滚动按源码位置与渲染节点对应，不能简单按百分比。滚动同步可关闭；预览出错仍可编辑。

### S16 / 快速打开

⌘/Ctrl+P 打开搜索层，默认最近使用。↑↓选择、Enter 打开、Esc 关闭并回到原编辑位置。切换文章若有未保存内容先处理 S22，取消后保留搜索上下文。

## 04 / 文章元信息与新建

### S14 / 文章信息

标题、摘要、标签、draft 和可选 updated 映射到 frontmatter。作者沿用站点配置。未知字段和注释应尽量保留；表单更新只修改对应字段。日期从目录读取，变更通过移动流程。

### S41 完整源码 / S15 YAML 错误

错误展示行号与原因，暂时禁用表单更新。完整源码仍可修改，修复后重新校验。保留原文，不用空对象覆盖失败的 frontmatter。

### S17 → S18 / 新建

填写标题、文件名、日期和目录方式（slug.md / slug/index.md）。默认草稿，预先展示完整保存路径。禁止空文件名、路径分隔符、路径跳出以及项目不支持的字符。两种目录方式须一起检查地址冲突。

### S33 / 非草稿确认

切换为非草稿时说明“参与下次站点构建”，确认只更新编辑缓冲区，保存后写入。不会自动构建或部署；未来日期不是定时发布。

## 05 / 图片与资源

### S19 / 插入图片

原生文件选择、拖入与粘贴都进入同一流程。展示文件名、大小、替代文字与目标相对路径。图片默认复制到文章附近的 assets 目录；确认前可取消，不移动原图。

### S20 / 同名图片

默认保留两份并自动建议唯一名称；可返回选择其他图片或明确使用现有图片。不默认覆盖同名资源，若支持覆盖须另行确认受影响引用。

### S34 / 缺失资源

显示相对路径、替代文字与重新选择入口，其余正文正常显示。相对资源从文章所在目录解析，根路径从 content/public 解析。重定位后仅更新当前引用。

### 保存顺序与失败

先确保资源复制成功，再插入引用；复制失败不插入无效地址。正文保存失败时保留已复制资源记录，避免重复复制；不自动删除可能被共享的图片。

## 06 / 保存、冲突与恢复

### 保存状态

状态机：已保存 → 有未保存修改 → 保存中 → 已保存 / 保存失败。只有磁盘写入确认成功后显示已保存。保存时捕获版本号；若输入继续发生，写入完成仍显示未保存的新版本。

### S22 / 离开前保存

关闭窗口、切换文章或项目时提供保存并继续、放弃修改、取消。保存失败停留当前文档；取消回到原位置。不能把后台恢复副本当作文件已保存。

### S23 / 外部文件变更

没有本地修改可自动重载并提示。有本地修改则暂停覆盖，比较当前与磁盘版本。提供另存当前、重新加载磁盘、取消。重新加载前说明将舍弃当前修改，保留可恢复副本。

### S24 / 保存失败与 S25 / 恢复

失败明确是权限、空间、路径或其他错误；提供重试与另存。恢复副本存应用用户目录，原项目保持普通 Markdown。崩溃恢复先进入缓冲区，用户保存后再写原文件。

## 07 / 文件移动、删除与地址

### S21 → S42 / 移动或重命名

先输入新文件名或日期，再检查目标冲突、相关图片与内部引用。展示旧路径、新路径以及新旧地址；用户确认影响后执行。检查失败时不发生部分移动。

### 链接影响

移动会影响相对资源、内部引用及已上线地址。应用内可以更新已识别的项目引用；部署平台重定向需独立配置，不宣称自动完成。未知动态引用必须列为无法确定。

### S36 / 删除

显示文章标题和受影响的引用；默认移入系统回收站，不永久删除，不自动删除共享附件。系统回收站不可用时说明原因，禁止静默退化为永久删除。

### 一致性

成功后更新索引，移除旧路径，并选中合理的相邻文章。失败保留原状态和错误详情。打开的文件被外部移动或删除时允许另存当前内容。

## 08 / 项目样式与扩展兼容

### S26–S28 / 配置与状态

主题读取 src/styles/theme.css，正文读取 src/styles/markdown.css，渲染规则适配 .vitepress/config.ts。状态分为已适配、依赖缺失、加载失败、未识别；不能仅扫描到名称就显示兼容。

### S35 / 必须覆盖的语法

Shiki 双主题、行号、指定行高亮、差异、聚焦、代码组；MathJax；Mermaid；tip/warning/danger/info/details；脚注、任务列表、定义、缩写、高亮、上下标、Emoji；标题去重与二三级目录。

### 隔离与错误

预览不获得文件写入权限，不执行正文脚本。项目配置是可执行代码，不在目录检测时直接运行。隔离渲染进程并不自动等于系统权限沙箱。失败保留上次成功预览，明确标识未更新。

### 验收

用现有两篇指南加补充语法样例逐项比对项目构建和编辑器预览，覆盖明暗主题、草稿、未保存内容、代码复制与图表错误回退。项目 CSS 更改能热更新，错误不阻断写作。

## 09 / 外观、平台与可访问性

### S29–S32 / 平台外观

Windows、Linux 使用 Ctrl；macOS 使用 ⌘。窗口按钮位置和菜单遵循平台。Figma 原型中的窗口控制为示意；正式版本使用平台窗口管理。Light / Dark / System 模式独立于内容状态。

### 窗口布局

基准 1440×900；固定导航 208px；查找列表 444px；剩余空间为概览。紧凑窗口 1080px 使用单栏写作。拖拽分栏记住比例，窗口不足时不挤压正文到不可读宽度。

### 键盘与焦点

所有操作可键盘到达；焦点 2px 外轮廓。弹窗限制焦点范围，关闭后回到触发器；Esc 只关闭当前层，危险操作不绑定裸 Enter。列表使用方向键选择，按钮有可读名称。

### 阅读与动效

Noto Sans SC 与 JetBrains Mono，中文字体替代遵循项目栈。普通文字对比目标 4.5:1；状态同时用文字表达。160ms 过渡，系统减少动态效果时禁用位移动画。

## 10 / 验收与实现边界

### 数据与大文章库

至少用空库、千篇文章、长标题、多标签、中文路径和长文测试。初次索引不冻结界面；之后只增量更新。排序稳定，显示数量与过滤结果一致。

### 保存与平台

三平台验证原生选目录、中文输入法、快捷键、大小写路径、符号链接和文件监听。并发修改、权限失败、磁盘满、目录删除、应用崩溃时不得丢失编辑缓冲区。

### 设计一致性

无长日期树；查找与写作状态切换清晰。窄屏、深色、空结果、禁用、焦点和错误状态都可辨认。检查正文与代码块布局，主题变量不泄漏到应用工具栏。

### 开发交接

建议 Electron + Vue 3 + TypeScript + CodeMirror 6；独立的 Thus.Live 适配器处理内容约定。Figma 是行为与视觉依据，交互演示不能作为真实功能验收；代码实现后另跑完整端到端测试。

## 页面索引

- [S01 / 首次连接项目](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=11-105)
- [S02 / 项目检测完成](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=15-454)
- [S03 / 项目路径失效](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=15-478)
- [S04 / 空项目](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=12-492)
- [S05 / 全部文章](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=9-8)
- [S06 / 搜索文章](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=12-103)
- [S07 / 日期归档](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=12-183)
- [S08 / 标签筛选](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=12-263)
- [S09 / 草稿列表](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=12-339)
- [S10 / 搜索无结果](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=12-419)
- [S11 / 分栏写作](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=10-66)
- [S12 / 纯写作](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=14-310)
- [S13 / 完整预览](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=14-369)
- [S14 / 文章信息](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=16-470)
- [S15 / 元信息格式需要修复](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=16-551)
- [S16 / 快速打开文章](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=16-626)
- [S17 / 新建文章](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=16-701)
- [S18 / 文件名已存在](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=16-782)
- [S19 / 插入图片](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=16-857)
- [S20 / 图片文件同名](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=16-935)
- [S21 / 移动或重命名文章](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=19-797)
- [S22 / 保存修改后再离开？](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=19-875)
- [S23 / 文件已在其他程序中修改](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=19-949)
- [S24 / 保存失败，内容仍在](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=19-1026)
- [S25 / 发现未保存的恢复副本](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=19-1100)
- [S26 / 项目设置](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=20-1120)
- [S27 / 渲染兼容性](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=20-1206)
- [S28 / 预览加载失败](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=20-1292)
- [S29 / 外观与写作](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=20-1378)
- [S30 / 快捷键](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=20-1464)
- [S31 / macOS 深色写作](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=14-428)
- [S32 / Linux 紧凑写作](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=14-487)
- [S33 / 将文章设为非草稿？](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=19-1177)
- [S34 / 图片缺失预览](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=21-1260)
- [S35 / 扩展语法预览](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=21-1326)
- [S36 / 移入回收站？](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=19-1249)
- [S37 / 按日期筛选](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=25-1324)
- [S38 / 选择标签](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=25-1405)
- [S39 / 文章操作](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=25-1486)
- [S40 / 正在检查项目](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=25-1563)
- [S41 / 完整源文件](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=28-1486)
- [S42 / 确认移动影响](https://www.figma.com/design/GBJVh0iLtAnjrq4pye75YS?node-id=28-1555)
