# README 截图

本目录图片由 [`scripts/capture-docs.mjs`](../../scripts/capture-docs.mjs) 启动真实 Electron 应用生成，使用临时示例项目，不是设计稿或合成界面。截图更新时的环境为 Windows，内容区为 1440 × 1000。

| 文件 | 页面 |
| --- | --- |
| `article-library.png` | 文章列表、筛选和宽幅预览 |
| `split-editor.png` | Markdown 分栏编辑 |
| `homepage-editor.png` | 首页信息编辑 |
| `blog-settings.png` | 博客信息配置 |
| `dark-editor.png` | 深色写作界面 |

在项目根目录执行：

```sh
pnpm build
pnpm docs:screenshots
```

运行后检查图片清晰度、字体加载、导航顺序与内容是否完整，再提交文档。截图数据为示例，不表示真实博客的当前内容。
