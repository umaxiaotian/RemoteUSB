# Bundled usbipd-win 5.3.0 (x64)

Unmodified official MSI: https://github.com/dorssel/usbipd-win/releases/tag/v5.3.0

This is the Windows USB/IP **server**, separate from the usbip-win2 client.
Select it on the RemoteUSB installer's USB components page. The official MSI wizard runs after RemoteUSB files are installed, with administrator permission. The MSI handles the service, drivers, PATH and its firewall rule; RemoteUSB does not share any device automatically. Refresh Shared Devices after setup.

The installer is also available in this folder for repair/retry. USBip and usbipd-win setups run sequentially. Silent RemoteUSB installs skip both optional setups. Removing RemoteUSB does not remove these separately installed products or their persistent sharing configuration.

## 日本語

RemoteUSBのインストールウィザードのUSBコンポーネント選択で、共有用のusbipd-winを選択してください。公式MSIを同梱しているため、別途ダウンロードする必要はありません。管理者権限・公式セットアップの案内に従い、完了後にUSB共有画面を更新してください。サービス・ドライバー・ファイアウォール規則は公式MSIが設定します。デバイスは自動共有しません。

## Licensing and corresponding source

usbipd-win is GPL-3.0-only. Keep COPYING.md, this notice, the matching source-5.3.0.zip and upstream source notices with every distribution of the MSI. The MSI and source archive are unmodified. Copyright remains with upstream authors; no warranty is provided. RemoteUSB communicates through the CLI rather than linking this code.

The source archive includes the build configuration, dependency lock files and upstream third-party notices. Driver source availability is documented in DRIVER-SOURCES.md (VirtualBox 7.2.2, https://download.virtualbox.org/virtualbox/7.2.2/VirtualBox-7.2.2.tar.bz2). WSL helper source projects are documented in WSL-SOURCES.md. Preserve these notices and source-access information in releases; do not distribute the MSI alone without the required materials.

Original URLs and SHA-256 hashes are recorded in manifest.json. Fetch with `pnpm vendor:fetch`; verify with `pnpm vendor:verify`. The setup helper also validates the MSI hash and Authenticode signature before launch.
