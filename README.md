<p align="center"><strong>基于 Tauri 框架，将任何网页转换为轻量级桌面应用</strong></p>

## 核心特性

- **轻量级** - 相比 Electron 应用体积减少 20 倍，仅 5MB 左右
- **高性能** - 基于 Rust Tauri 框架，内存占用更少，运行更流畅
- **功能丰富** - 支持快捷键透传、沉浸式窗口、样式定制、系统托盘等
- **跨平台** - 支持 macOS、Windows、Linux 三大平台

## 快速开始

更多预构建应用可在 [Release](https://github.com/tw93/Pake/releases) 页面下载。

### 使用方式

1. **直接下载**：从 [Release](https://github.com/tw93/Pake/releases) 页面下载预构建应用
2. **命令行打包**：使用 CLI 工具自定义打包
3. **源码构建**：克隆项目进行定制开发

## 命令行打包

```bash
# 安装 CLI 工具
npm install -g pake-cli

# 打包网页为桌面应用
pake <url> [选项]

# 示例
pake https://weekly.tw93.fun --name Weekly --hide-title-bar
```

## 源码构建

**环境要求**：Rust >=1.63、Node >=16

```bash
# 安装依赖
npm install

# 本地开发
npm run dev

# 构建应用
npm run build
```

## 配置说明

### pake.json 配置参数

**基础窗口配置**：
- `url`: 目标网页地址或本地文件路径 
  - 示例：`"https://github.com"` 或 `"./index.html"`
- `url_type`: URL类型，`"web"` 表示网页，`"local"` 表示本地文件
  - 示例：`"web"` 或 `"local"`
- `width`: 窗口宽度，默认 1200px
  - 示例：`1400`
- `height`: 窗口高度，默认 780px
  - 示例：`900`
- `resizable`: 是否可调整窗口大小，默认 true
  - 示例：`false`（固定窗口大小）
- `fullscreen`: 是否全屏显示，默认 false
  - 示例：`true`（启动时全屏）
- `hide_title_bar`: 是否隐藏标题栏（沉浸式），默认 false
  - 示例：`true`（无边框窗口）
- `always_on_top`: 是否窗口置顶，默认 false
  - 示例：`true`（窗口始终在最前）
- `dark_mode`: 是否强制深色模式（仅 macOS），默认 false
  - 示例：`true`（强制深色主题）

**交互配置**：
- `activation_shortcut`: 唤醒应用的快捷键，默认为空
  - 示例：`"CmdOrCtrl+Shift+P"`（Cmd/Ctrl+Shift+P 唤醒）
- `disabled_web_shortcuts`: 是否禁用网页快捷键，默认 false
  - 示例：`true`（禁用 F12、Ctrl+U 等）

**系统托盘配置**：
- `system_tray`: 各平台是否启用系统托盘
  - `macos`: macOS 系统托盘，默认 true
    - 示例：`false`（macOS 不显示托盘）
  - `linux`: Linux 系统托盘，默认 true  
    - 示例：`true`（Linux 显示托盘）
  - `windows`: Windows 系统托盘，默认 true
    - 示例：`true`（Windows 显示托盘）
- `system_tray_path`: 托盘图标路径
  - 示例：`"png/custom_tray.png"`

**高级配置**：
- `user_agent`: 自定义浏览器标识
  - `macos`: macOS 平台 User-Agent
    - 示例：`"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15"`
  - `linux`: Linux 平台 User-Agent
    - 示例：`"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"`
  - `windows`: Windows 平台 User-Agent
    - 示例：`"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"`
- `inject`: 注入的 JavaScript 文件列表
  - 示例：`["scripts/custom.js", "scripts/theme.js"]`
- `proxy_url`: 代理服务器地址
  - 示例：`"http://127.0.0.1:8080"`

### tauri.conf.json 配置参数

**应用信息**：
- `productName`: 应用产品名称
  - 示例：`"GitHub Desktop"`
- `identifier`: 应用唯一标识符（如 com.pake.xxx）
  - 示例：`"com.github.desktop"`
- `version`: 应用版本号
  - 示例：`"1.2.3"`

**打包配置**：
- `bundle.icon`: 应用图标文件路径列表
  - 示例：`["/path/to/app.icns", "/path/to/app.ico"]`
- `bundle.targets`: 打包目标格式（如 dmg、deb、appimage）
  - 示例：`["dmg"]`（macOS）或 `["deb", "appimage"]`（Linux）
- `bundle.resources`: 打包时包含的资源文件
  - 示例：`["icons/*.png", "assets/*"]`

### CLI 命令行参数

**基础参数**：
- `--name`: 应用名称
  - 示例：`--name "My App"`
- `--icon`: 应用图标路径
  - 示例：`--icon ./assets/icon.png`
- `--width`: 窗口宽度（默认 1200）
  - 示例：`--width 1400`
- `--height`: 窗口高度（默认 780）
  - 示例：`--height 900`
- `--app-version`: 应用版本（默认 1.0.0）
  - 示例：`--app-version 2.1.0`

**窗口行为**：
- `--resizable`: 窗口可调整大小（默认启用）
  - 示例：`--resizable false`（固定窗口大小）
- `--fullscreen`: 全屏模式
  - 示例：`--fullscreen`（启动时全屏）
- `--hide-title-bar`: 隐藏标题栏
  - 示例：`--hide-title-bar`（无边框窗口）
- `--always-on-top`: 窗口置顶
  - 示例：`--always-on-top`（窗口始终在最前）
- `--dark-mode`: 强制深色模式（仅 macOS）
  - 示例：`--dark-mode`（强制深色主题）

**功能开关**：
- `--disabled-web-shortcuts`: 禁用网页快捷键
  - 示例：`--disabled-web-shortcuts`（禁用 F12、Ctrl+U 等）
- `--show-system-tray`: 启用系统托盘
  - 示例：`--show-system-tray`
- `--multi-arch`: 多架构支持（仅 macOS，支持 Intel 和 M1）
  - 示例：`--multi-arch`（同时支持 Intel 和 M1 芯片）
- `--use-local-file`: 递归复制本地文件
  - 示例：`--use-local-file`（复制本地文件夹）
- `--debug`: 调试模式
  - 示例：`--debug`（输出详细日志）

**高级配置**：
- `--activation-shortcut`: 唤醒快捷键
  - 示例：`--activation-shortcut "CmdOrCtrl+Shift+P"`
- `--user-agent`: 自定义 User-Agent
  - 示例：`--user-agent "Custom Browser 1.0"`
- `--system-tray-icon`: 托盘图标路径
  - 示例：`--system-tray-icon ./assets/tray.png`
- `--inject`: 注入的 JS 文件路径
  - 示例：`--inject ./scripts/custom.js`
- `--proxy-url`: 代理服务器地址
  - 示例：`--proxy-url http://127.0.0.1:8080`
- `--targets`: Linux 打包格式（deb/appimage/all）
  - 示例：`--targets deb` 或 `--targets "deb,appimage"`
- `--installer-language`: Windows 安装程序语言（默认 en-US）
  - 示例：`--installer-language zh-CN`（中文安装程序）

更多高级用法请参考 [Wiki 文档](https://github.com/tw93/Pake/wiki)

## 技术架构

**核心技术栈**：
- **前端**：TypeScript + CLI 工具
- **后端**：Rust + Tauri 框架
- **打包**：支持 macOS、Windows、Linux 多平台

**主要组件**：
- `bin/` - CLI 工具和构建器
- `src-tauri/` - Rust 核心逻辑
- 支持插件：窗口状态、单实例、OAuth、HTTP、Shell、通知等
