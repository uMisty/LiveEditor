# 第三方资源说明

Thus.Live Editor 的项目代码由 **uMisty** 以 [0BSD](LICENSE) 发布。第三方依赖与资源仍适用其自身许可证，项目许可证不替代这些条款。

## 内置字体

| 字体 | 文件 | 许可证 |
| --- | --- | --- |
| Noto Sans SC | `public/fonts/NotoSansSC.ttf` | [SIL Open Font License 1.1](public/fonts/NotoSansSC-OFL.txt) |
| JetBrains Mono | `public/fonts/JetBrainsMono.ttf` | [SIL Open Font License 1.1](public/fonts/JetBrainsMono-OFL.txt) |

字体随应用资源一起分发，相应许可文本保留在字体目录中。

## 运行时与依赖

Electron、Chromium、Node.js、Vue、CodeMirror、VitePress、Shiki、Mermaid、DOMPurify 及其他依赖的版权与许可属于各自作者。依赖清单与版本范围见 `package.json`，锁定版本见 `pnpm-lock.yaml`，具体许可见各依赖包随附的 LICENSE / NOTICE 文件。

Electron 发行目录中的 `LICENSE`、`LICENSES.chromium.html` 等第三方声明应保留。项目自身的 `LICENSE` 随应用资源打包，不覆盖发行目录中的第三方许可文件。
