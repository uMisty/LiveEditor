# Release notes archive

这里保存 Thus.Live Editor 每个版本的人工维护说明，作为 GitHub Releases 正文的长期来源，也方便下一版回顾上次发布之后的变化。

## 文件约定

- 每个版本使用独立文件：`vX.Y.Z.md`。
- 文件名必须与 `package.json` 版本和 Git 标签一致，例如 `package.json` 的 `0.2.0` 对应 `v0.2.0.md`。
- 文件内容会原样成为 GitHub Release 正文，因此需要保留的安装提示、签名状态和兼容性说明应直接写在版本文件中。`SHA256SUMS.txt` 作为独立 Release 资源生成，不写入正文。
- 已发布版本原则上不改写；如需纠正事实，提交修改并在文件末尾记录修订原因。

## 新版本整理流程

1. 复制 [`TEMPLATE.md`](TEMPLATE.md) 为新的 `vX.Y.Z.md`。
2. 对照上一个版本说明、Git 提交和实际界面，整理新增、改进、修复和兼容性变化。
3. 更新 `package.json` 版本，并同步必要的 README、隐私政策、验证记录和截图。
4. 完成 `pnpm test`、`pnpm build` 和 `pnpm test:e2e`。
5. 运行 `Desktop builds`，再运行 `Publish desktop release`。
6. `release_notes` 留空时，发布工作流会自动读取对应的归档文件；只有需要临时覆盖时才手动填写。归档文件缺失或为空时，发布校验会直接失败。

## 已归档版本

- [v0.1.0 — 首个公开版本](v0.1.0.md)
