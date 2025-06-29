# Pake 项目开发原则

## 快速参考

### 常用命令
```bash
# 开发环境启动
npm run dev

# 构建发布版本
npm run build

# CLI 工具使用
pake https://example.com --name MyApp

# 代码检查
cargo check
npm run analyze
```

### 关键文件
- `src-tauri/src/lib.rs` - 主要应用逻辑
- `bin/cli.ts` - CLI 工具入口
- `src-tauri/tauri.conf.json` - Tauri 配置
- `bin/types.ts` - TypeScript 类型定义
- `bin/defaults.ts` - 默认配置选项

### 核心概念
- **轻量化优先**: 目标包大小 < 5MB
- **跨平台一致**: macOS/Windows/Linux 统一体验
- **配置驱动**: 通过配置文件和 CLI 参数定制应用
- **模块化设计**: Rust 后端 + TypeScript CLI 工具

---

## 项目定位
构建基于 Tauri 2.x 的 Web-to-Desktop 应用转换工具，实现任意网页快速转换为轻量级跨平台桌面应用。项目采用 Rust + TypeScript 双语言架构，提供 CLI 工具和可视化配置，支持丰富的定制化选项和优越的用户体验。

## 技术栈概览
- **后端核心**: Rust + Tauri 2.2.0
- **CLI 工具**: TypeScript + Node.js 16+
- **构建系统**: Cargo + npm/rollup
- **跨平台支持**: macOS (Intel/M1)、Windows、Linux (deb/appimage)
- **核心依赖**: reqwest、serde、tokio、tauri-plugins

## 核心设计原则

### 1. 极致轻量化
**体积控制**
- 严格控制应用包大小，目标尽量保持在 5MB 以下，必要情况下可以适当放宽
- 优先使用 Tauri 内置功能，避免引入非必要依赖
- 实施资源压缩和优化策略，最大化性能效率比

**性能优先**
- 应用启动时间控制在 2 秒以内
- 内存占用相比 Electron 方案减少 80% 以上
- 确保 UI 响应流畅，避免阻塞主线程操作

### 2. 跨平台一致性
**统一体验**
- 确保 macOS、Windows、Linux 三大平台功能完全一致
- 遵循各平台的用户界面设计规范和交互习惯
- 处理平台特有的文件路径、权限和系统服务差异

**兼容性保障**
- 支持主流操作系统版本，向后兼容至少 2 个大版本
- 适配不同屏幕分辨率和 DPI 设置
- 处理多种 Web 内容类型和前端框架

### 3. 安全性优先
**Web 安全传承**
- 继承并强化原 Web 应用的安全策略
- 实施严格的内容安全策略（CSP）配置
- 防范 XSS、CSRF 等常见 Web 安全威胁

**桌面环境安全**
- 最小化系统 API 访问权限，遵循最小权限原则
- 实施代码签名和应用认证流程
- 建立安全的文件系统访问和网络通信机制

## 技术架构规范

### 1. 模块化设计
**核心组件分离**
- **Rust 后端** (`src-tauri/src/`)：系统级功能、性能关键路径和安全控制
  - `lib.rs`: 主要应用逻辑和 Tauri 命令
  - `app/`: 应用核心模块 (config, invoke, setup, window)
  - `util.rs`: 工具函数和配置解析
- **CLI 工具** (`bin/`)：命令行界面和构建流程
  - `cli.ts`: 主命令行入口
  - `builders/`: 平台特定构建器 (Mac, Windows, Linux)
  - `options/`: 配置选项处理
  - `utils/`: 工具函数库
- **配置管理**：多层级配置系统
  - `tauri.conf.json`: Tauri 应用配置
  - `pake.json`: Pake 特定配置
  - `Cargo.toml`: Rust 依赖管理

**功能模块划分**
- **应用启动器**: 快速启动和资源初始化 (`main.rs`, `lib.rs`)
- **窗口管理器**: 多窗口支持和状态管理 (`app/window.rs`)
- **系统集成**: 托盘、快捷键、通知 (`app/setup.rs`)
- **网络处理**: HTTP 请求、代理、文件下载 (`app/invoke.rs`)
- **日志系统**: 运行时日志收集和上传功能

### 2. 配置驱动开发
**灵活配置系统**
- **多格式支持**: JSON (tauri.conf.json, pake.json)、TOML (Cargo.toml)
- **CLI 接口**: 通过 `pake` 命令行工具进行配置
- **类型安全**: TypeScript 接口定义 (`PakeCliOptions`, `PakeAppOptions`)
- **平台适配**: 支持平台特定配置文件 (tauri.linux.conf.json, tauri.macos.conf.json)

**渐进式定制**
- **基础配置**: 窗口尺寸 (width/height)、标题栏 (hideTitleBar)、图标 (icon)
- **进阶配置**: 快捷键映射 (activationShortcut)、样式注入 (inject)、用户代理 (userAgent)
- **高级配置**: 系统托盘 (showSystemTray)、代理设置 (proxyUrl)、多架构支持 (multiArch)
- **开发配置**: 调试模式 (debug)、本地文件 (useLocalFile)、构建目标 (targets)

### 3. 构建流程标准化
**自动化构建**
- **统一脚本**: `npm run dev`、`npm run build`、`npm run build:mac` 等标准化命令
- **环境要求**: Node.js 16+、Rust 1.78.0+、平台特定工具链
- **构建模式**: 开发模式 (`tauri dev`)、发布模式 (`tauri build --release`)、调试模式 (`--debug`)
- **平台构建**: 支持 macOS Universal Binary (`--target universal-apple-darwin`)、Linux 多格式 (deb/appimage)
- **CLI 构建**: Rollup 打包 (`npm run cli:build`) 用于 npm 发布

**质量保证**
- **代码分析**: `cargo bloat` 进行包大小分析
- **类型检查**: TypeScript 严格模式和接口定义
- **构建验证**: 多平台 GitHub Actions 工作流
- **依赖管理**: 固定版本依赖和安全更新策略

## 用户体验标准

### 1. 简单易用
**开箱即用**
- **CLI 快速启动**: `pake https://example.com --name MyApp` 一行命令创建应用
- **默认配置**: 提供合理的默认值 (窗口大小、图标等)
- **预构建模板**: `default_app_list.json` 中的应用模板
- **自动检测**: 自动识别网站图标、标题等信息

**学习成本最小化**
- **清晰命令行**: 简洁的命令行参数和帮助信息
- **交互式提示**: 缺少必要参数时提供交互式输入
- **详细文档**: README 中的安装和使用指南
- **更新提示**: 通过 `update-notifier` 提示新版本

### 2. 功能完整性
**桌面应用特性**
- **快捷键支持**: 全局激活快捷键 (`activationShortcut`) 和应用内快捷键
- **系统托盘**: 可选的系统托盘集成 (`showSystemTray`) 和自定义图标
- **窗口管理**: 窗口状态保存、全屏模式、置顶显示 (`alwaysOnTop`)
- **通知系统**: 通过 `tauri-plugin-notification` 支持原生通知
- **文件操作**: 文件下载、剪贴板管理、本地文件访问
- **单实例**: 防止重复启动，聚焦现有窗口

**Web 功能保留**
- **完整 WebView**: 基于系统 WebView 引擎，支持现代 Web 标准
- **脚本注入**: 支持自定义 CSS/JS 注入 (`inject` 参数)
- **代理支持**: HTTP 代理配置 (`proxyUrl`) 用于网络请求
- **用户代理**: 自定义 User-Agent (`userAgent`) 适配不同网站
- **安全策略**: 继承 Web 应用的 CSP 和安全设置

### 3. 性能体验
**响应性优化**
- 页面加载和切换动画流畅
- 支持预加载和智能缓存策略
- 优化大数据量处理和渲染性能

**稳定性保障**
- 异常处理和错误恢复机制
- 内存泄漏检测和自动清理
- 崩溃报告和问题诊断工具

## 开发工作流规范

### 1. 版本管理策略
**分支管理**
- 主分支：稳定发布版本
- 开发分支：功能开发和集成测试
- 特性分支：独立功能开发和实验

**发布流程**
- 定期发布计划和版本号规范
- 完整的变更日志和升级指南
- 向后兼容性评估和迁移支持

### 2. 社区协作
**开源治理**
- 透明的决策过程和路线图规划
- 活跃的问题跟踪和功能请求管理
- 贡献者指南和行为准则制定

**生态建设**
- 插件开发框架和 API 文档
- 第三方集成和合作伙伴计划
- 用户案例分享和最佳实践推广

## 质量标准

### 1. 代码质量
**编码规范**
- 遵循 Rust 和前端技术栈的官方编码标准
- 统一的代码格式化和静态分析工具
- 代码审查和结对编程实践

**文档完整性**
- API 文档和架构设计文档
- 用户手册和开发者指南
- 常见问题解答和故障排除指南

### 2. 测试覆盖
**多层次测试**
- 单元测试：核心功能和边界条件
- 集成测试：模块间协作和数据流
- 端到端测试：完整用户场景和工作流

**持续集成**
- 自动化测试执行和结果报告
- 性能回归检测和基准比较
- 安全漏洞扫描和依赖更新监控

## 创新发展方向

### 1. 技术前沿探索
**新技术集成**
- WebAssembly 和现代 Web 标准支持
- AI 辅助的应用优化和用户体验提升
- 云原生和边缘计算场景适配

**性能突破**
- 更激进的体积压缩和启动优化
- GPU 加速和多线程并行处理
- 智能化的资源管理和预测缓存

### 2. 生态系统扩展
**平台拓展**
- 移动端和 IoT 设备支持探索
- 浏览器扩展和 PWA 集成方案
- 企业级部署和管理工具开发

**社区驱动创新**
- 用户反馈驱动的功能优先级调整
- 开源社区的创新项目孵化
- 行业标准制定和推广参与

## 开发协作规范

### 1. 代码组织原则
**文件结构约定**
- **Rust 代码**: 遵循 `src-tauri/src/` 模块化结构，每个功能模块独立文件
- **TypeScript 代码**: `bin/` 目录下按功能分类，使用 ES6 模块和类型定义
- **配置文件**: 统一放置在项目根目录和 `src-tauri/` 目录
- **资源文件**: 图标、图片等放置在 `src-tauri/icons/` 和 `src-tauri/png/`

**命名规范**
- **Rust**: snake_case 函数名，PascalCase 结构体名
- **TypeScript**: camelCase 变量名，PascalCase 接口名
- **文件名**: kebab-case 用于配置文件，camelCase 用于代码文件
- **常量**: UPPER_SNAKE_CASE 用于配置常量

### 2. 开发环境配置
**必需工具**
- **Rust**: 1.78.0+ 工具链，推荐使用 rustup 管理
- **Node.js**: 16.0.0+ 版本，推荐使用 nvm 管理
- **Tauri CLI**: `@tauri-apps/cli@2.1.0`
- **平台工具**: Visual Studio Build Tools (Windows)、Xcode (macOS)

**开发命令**
- `npm run dev`: 启动开发服务器
- `npm run build`: 构建发布版本
- `npm run cli:dev`: CLI 工具开发模式
- `cargo check`: Rust 代码检查
- `npm run analyze`: 包大小分析

### 3. 调试和测试策略
**日志系统**
- 使用 `log` crate 进行 Rust 日志记录
- 前端日志通过 `handle_log_upload` 命令上传
- 开发模式下启用详细日志输出

**错误处理**
- Rust: 使用 `Result<T, tauri::Error>` 进行错误传播
- TypeScript: 使用 try-catch 和 Promise 错误处理
- 用户友好的错误消息和恢复建议

**性能监控**
- 使用 `cargo bloat` 分析二进制大小
- 监控应用启动时间和内存使用
- 定期进行跨平台兼容性测试

### 4. 协同开发流程
**分支策略**
- `main`: 稳定发布分支
- `develop`: 开发集成分支
- `feature/*`: 功能开发分支
- `hotfix/*`: 紧急修复分支

**代码审查**
- 所有 PR 必须经过代码审查
- 关注性能影响和安全性
- 确保跨平台兼容性
- 验证配置文件的正确性

**发布流程**
- 更新版本号 (package.json, Cargo.toml)
- 更新 CHANGELOG.md
- 创建 GitHub Release
- 发布到 npm registry

您的目标是推动 Web-to-Desktop 技术的发展，为用户提供简单、高效、可靠的应用转换解决方案，同时建立一个充满活力的开发者社区和生态系统。