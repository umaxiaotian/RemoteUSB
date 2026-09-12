# Bundled usbip-win2 0.9.8.0

Upstream: https://github.com/vadimgrn/usbip-win2/releases/tag/v.0.9.8.0

The original x64 USBip installer is included unmodified. It contains the client CLI, its dependent libraries, and the USBip UDE/filter driver setup. RemoteUSB runs it during installation with the upstream `main,client` components and VC++ runtime fixed. No driver installation is performed during development or build verification.

The upstream project describes its released drivers as WHLK certified or attestation signed. The installer Authenticode signature and GitHub asset SHA-256 were verified at download. The executable signature is not itself a kernel-driver compatibility test.

## Installation / インストール

RemoteUSB runs USBip-0.9.8.0-x64.exe during installation with the required client and driver components. Administrator permission is required. Setup may briefly restart USB hubs and interrupt attached USB devices; finish USB storage transfers/calls beforehand.

RemoteUSB finds the installed CLI in Program Files/USBip/usbip.exe, then PATH. For a custom installation directory, select the absolute usbip.exe path in Settings. The CLI's DLLs must stay with it. Restart/refresh RemoteUSB after installation.

公式インストーラーを未改変で同梱しています。RemoteUSBのインストーラーで導入を選ぶか、このフォルダーのUSBipインストーラーを実行してください。管理者権限が必要で、導入中はUSBハブの再起動によりUSB機器が一時的に停止します。カスタム導入先はRemoteUSBの設定でusbip.exeを指定してください。RemoteUSBの削除ではUSBipを削除しません。Windowsの「インストールされているアプリ」から個別に管理できます。

usbip-win2 is a Windows **client**. It has no usbipd.exe server or legacy attacher.exe. The old cezanne 0.3.5 development-driver bundle is no longer shipped. Configure the server separately (e.g. Linux usbipd).

## License and provenance

BSD-2-Clause: full copyright, terms and disclaimer are in LICENSE.txt. Keep this notice and license with binary redistribution. The unmodified upstream installer retains its own bundled third-party materials. RemoteUSB does not link libusbip into its process.

source-0.9.8.0.zip is a convenience copy of the matching tag source; public development PFX/P12 keys are omitted, no program source is changed. Use your own signing credentials and fetch the submodules/dependencies specified by upstream to rebuild. Original URLs/hashes and the redistributed file hashes are in manifest.json. Run pnpm vendor:fetch to reproduce, pnpm vendor:verify to verify.

署名済み公式リリースを利用し、RemoteUSB自身は証明書の導入、テスト署名、Secure Boot、ファイアウォールの変更を行いません。実機・OSとの互換性は対象環境で確認してください。

## Minimal client setup

RemoteUSB starts the official installer with `/VERYSILENT /COMPONENTS=main,client /TASKS=vcredist`. This selects the CLI, its DLLs, required client drivers and Visual C++ runtime, without the optional GUI, SDK, PDB symbols or desktop shortcut. The upstream installer remains unmodified and existing optional files from a previous full installation are not proactively removed.

RemoteUSBからは `/VERYSILENT /COMPONENTS=main,client /TASKS=vcredist` で起動し、CLI・DLL・ドライバーと必要なVisual C++ランタイムを導入します。GUI・SDK・PDB・デスクトップショートカットは導入しません。過去のフルインストールで追加したファイルを自動削除する処理は行いません。
