# RemoteUSB

[文档](https://umaxiaotian.github.io/RemoteUSB/zh-CN/) · [文档网站开发与部署（英文）](docs/documentation.md)

![RemoteUSB — Windows USB/IP 客户端与服务器](docs/social-preview.png)

[English](README.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh-CN.md)

使用 Electron、React、TypeScript 和 Ant Design 构建的 Windows USB/IP 桌面客户端，采用 Windows 11 风格界面。

项目目前处于 MVP 阶段。可以在无需驱动程序的演示模式下体验界面，也可以通过 **usbip-win2 0.9.8.0** 后端连接共享 USB 设备。实际驱动安装和 USB 硬件连接仍需单独验证。

## 主要功能

- 设备浏览、搜索、连接状态、连接/断开和诊断详情。
- 服务器添加、编辑、删除、启用/禁用及连接测试。
- 按设备自动重连，采用指数退避，最长等待五分钟。
- 支持英语、日语、韩语和简体中文，包括托盘与通知；可跟随系统语言。
- 浅色、深色和系统主题；Windows 11 build 22621 及以上支持原生 Mica。
- 托盘、通知、设置、历史记录及窗口位置和大小保存。
- 无需驱动即可用于开发与演示的模拟后端。

## 截图

以下截图来自使用模拟后端运行的 Electron 应用。

![浅色主题](docs/screenshots/devices-light.png)
![深色主题](docs/screenshots/devices-dark.png)

## 环境要求

- Windows 11 x64。
- 开发环境：Node.js 24 LTS、pnpm 10.32.1。
- 实际连接：已安装的 usbip-win2 客户端、DLL、驱动程序，以及单独配置的 USB/IP 服务器。
- 演示模式无需驱动程序、管理员权限或 USB 硬件。

## 安装

从源代码构建 Windows 安装程序：

```powershell
pnpm install
pnpm package
```

生成的 NSIS 安装程序位于 `release/RemoteUSB-Setup-0.1.3.exe`。RemoteUSB 发布构建默认未签名。

安装包包含**未经修改的官方 USBip 0.9.8.0 x64 安装程序**。安装过程中选择安装 USBip 后，会先验证 SHA-256 和 Authenticode 签名，再打开官方安装界面。请按照管理员权限、组件选择和重启提示操作。静默安装 RemoteUSB 时不会启动 USBip 安装程序。

**安装 USBip 可能重启 USB 集线器，导致 USB 设备短暂中断。请先完成 USB 存储传输和通话。** RemoteUSB 不会修改 Secure Boot 或测试签名设置。USBip 作为独立应用安装，卸载 RemoteUSB 不会同时卸载 USBip。

EXE、安装程序和托盘使用 RemoteUSB 图标。安装程序将通知名称注册为 RemoteUSB；通过 Electron 启动开发版本时，通知来源名称可能不同。

## 开发与演示模式

```powershell
npm.cmd install -g pnpm@10.32.1
pnpm install
pnpm dev:mock
```

使用 `pnpm dev` 启动实际后端。如果 PowerShell 阻止脚本运行，可使用 `pnpm.cmd` 和 `npm.cmd`，无需修改执行策略。

演示模式提供串口、Arduino、调试探针、智能卡、打印机和存储设备示例。操作具有 750 ms 的模拟延迟，可在设置中调整演示错误概率来模拟故障。

演示设置保存在 `demo.json`，实际设置保存在 `settings.json`。要返回实际后端，请移除 `--mock` 和 `REMOTEUSB_BACKEND=mock` 后重新启动。也可以使用 `pnpm exec electron . --mock` 启动已构建的应用。

## USB/IP 配置

1. 在安装 RemoteUSB 时，或通过设置/关于中的附带工具，运行 USBip 安装程序。
2. 将可执行文件路径留空，会先查找 `Program Files/USBip/usbip.exe`，再查找 `PATH`。自定义安装位置需指定绝对路径，并将 DLL 保留在 CLI 所在目录。
3. 在 USB/IP 服务器上共享设备，然后在 RemoteUSB 中添加主机名和端口，默认端口为 3240。
4. 测试连接，刷新设备列表，然后选择连接。

usbip-win2 是 **Windows 客户端**，不是服务器。不再附带旧 cezanne 客户端、`usbipd.exe` 或 `attacher.exe`。CLI 支持的 TCP 端口范围为 1024–65535。

使用 `pnpm vendor:fetch` 重新获取固定版本的发布文件，使用 `pnpm vendor:verify` 验证附带文件的哈希。参阅[附带软件说明](vendor/usbip-win2/README.md)、[清单](vendor/usbip-win2/manifest.json)及[后端详细说明](docs/usbip-backend.md)（日语）。

## 测试与打包

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm package
```

单元测试覆盖解析、输入验证、错误、持久化、服务、进程限制、i18n 和 React UI。Electron E2E 使用模拟后端验证服务器操作、连接、四种语言、主题保存及 125/150/200% 缩放。E2E 需要桌面会话。

Windows CI 运行 lint、类型检查、测试、构建和 E2E。这些检查通过并不代表实际 USB 硬件兼容性已得到验证。

## GitHub 发布

[Release 工作流](.github/workflows/release.yml)支持两种方式：

- **手动运行：** 在 Actions → Release → Run workflow 中选择待发布分支，输入与 `package.json` 一致的标签，例如 `v0.1.3`。验证成功后，在已测试的提交上创建标签并发布 Release。
- **推送标签：** 推送版本匹配的标签，工作流会构建并发布对应提交。

发布附件包括安装程序、SHA-256 校验列表、usbip-win2 源代码和许可证。版本不一致、已有标签指向其他提交或覆盖已有 Release 的操作会被拒绝。请在仓库中启用 GitHub Actions。只有发布任务拥有仓库写入权限。

## 已知限制

- 实际驱动安装、硬件连接/断开、驱动升级和卸载需要在目标环境中验证。
- 只管理当前应用会话发起的连接。通过匹配端口和连接目标防止部分端口复用问题，但不支持同时使用外部 CLI 或崩溃后接管连接。
- 尚未实现 COM/PnP 匹配和内核驱动签名分类。
- 自动重连要求应用持续运行。登录时自动启动仅对已安装版本生效。
- 显示设备类别不代表保证兼容。摄像头、音频、采集、集线器和存储设备的实际运行尚未验证。
- 原生通知、辅助功能设置和 Mica 需要在目标 Windows 环境中验证。

## 故障排查

| 问题                      | 检查内容                                           |
| ------------------------- | -------------------------------------------------- |
| USB 支持需要配置          | 安装 USBip，检查 CLI 路径、DLL 和 UDE 驱动         |
| 服务器离线                | 检查地址、端口、防火墙和共享状态，然后刷新         |
| 连接失败                  | 检查其他 PC 是否占用、物理连接和驱动权限；查看详情 |
| Electron 提示“bad option” | 从启动环境中移除 `ELECTRON_RUN_AS_NODE`            |
| 设置文件损坏              | 原文件保留为 `.invalid-*`，应用使用默认设置启动    |

设置和日志保存在 Electron 的 `app.getPath('userData')` 下。可使用 `REMOTEUSB_DATA_DIR` 指定独立的测试目录。

## 架构与安全

- `apps/desktop/src/main`：窗口、托盘、IPC、服务、持久化和日志。
- `apps/desktop/src/preload`：沙盒 API 桥接。
- `apps/desktop/src/renderer`：React UI。
- `packages/core`、`packages/shared`、`packages/usb-backend`：模型、IPC/i18n、实际与模拟后端。
- `tests`、`scripts`、`vendor`：验证、打包工具和附带软件。

参阅[架构文档](docs/architecture.md)（日语）。应用启用上下文隔离和沙盒，禁用 Node 集成，验证 IPC，并通过允许列表限制外部链接。CLI 使用不经 shell 的 `execFile` 和已验证参数，默认超时为 10 秒，输出上限为 1 MB。请在可信 LAN 或 VPN 中使用 USB/IP。

## 许可证

RemoteUSB 采用 [MIT 许可证](LICENSE)。usbip-win2 采用 BSD-2-Clause，附带版权声明、许可证、未经修改的安装程序及对应源代码。源代码副本已排除公开的开发签名密钥。重新分发时请保留附带声明。参阅[第三方软件声明](THIRD_PARTY_NOTICES.md)。

## 共享本地 USB 设备

打开 **USB 共享**页面，通过 [usbipd-win](https://github.com/dorssel/usbipd-win)查看、共享或停止共享此电脑上的 USB 设备。官方 usbipd-win 5.3.0 MSI 已包含在 vendor/usbipd-win 中。可在安装向导的 USB 组件页面选择服务器，或从 USB 共享页面打开附带工具。客户端和服务器按顺序安装，默认都选中，可取消不需要的组件。应用从 Program Files 或 PATH 中查找，显示 Bus ID、VID:PID、共享状态及已连接的客户端。

共享操作会显示居中的确认对话框，并仅为该操作通过 Windows UAC 请求管理员权限。关闭应用后共享仍会保留，停止共享可能断开远程客户端。请在可信网络中配置 usbipd 服务和防火墙。演示模式不会修改电脑。实际硬件及 UAC 操作仍需手动验证。参阅[实现说明](docs/usb-server.md)。
