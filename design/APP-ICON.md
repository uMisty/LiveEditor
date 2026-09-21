# Thus.Live Editor 应用图标

以 Thus.Live 的 `content/public/favicon.svg` 为基础：保留几何字形与品牌绿色 `#2f6f61`，使用浅白色字形，并将原圆点演变为金色钢笔尖，区分博客站点与写作应用。圆角绿色底板在浅色、深色桌面均保持可辨识度。

- 矢量母版：`public/app-icon.svg`
- PNG：16、24、32、48、64、128、256、512、1024 像素，保留透明边缘
- Windows：`public/app-icon.ico`，内嵌 16–256 像素七档尺寸
- macOS：`public/app-icon.icns`，内嵌 128–1024 像素尺寸
- Linux 与运行时窗口：`public/app-icon.png`

修改 SVG 后运行 `pnpm icons` 重新生成资源，再运行 `pnpm build` / `pnpm dist`。生成脚本使用 Electron 渲染 SVG，不依赖额外图像处理库。

图标应用于窗口、macOS Dock、网页标签、打包后的应用，以及 Windows 安装器和卸载器。打包图标由 `package.json` 的 electron-builder 配置指定；运行时图标从开发目录或打包资源加载。Windows AppUserModelID 与安装包 appId 均为 `live.thus.editor`。

Windows 构建在当前机器验证；macOS/Linux 图标资源和构建配置已提供，需在对应系统生成及验证安装包。
