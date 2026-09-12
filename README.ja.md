# RemoteUSB

[ドキュメント](https://umaxiaotian.github.io/RemoteUSB/ja/) · [サイトの開発・公開手順（英語）](docs/documentation.md)

![RemoteUSB — Windows向けUSB/IPクライアント・サーバー](docs/social-preview.png)

[English](README.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh-CN.md)

Electron・React・TypeScript・Ant Designで構築した、Windows 11風UIのWindows向けUSB/IPクライアントです。

現在はMVPです。ドライバー不要のデモモードと、**usbip-win2 0.9.8.0** を利用する実バックエンドを用意しています。実ドライバーの導入とUSB機器での接続は、別途実機検証が必要です。

## 主な機能

- デバイス一覧・検索・接続状態・接続／切断・診断情報。
- サーバーの追加・編集・削除・有効／無効切り替え・接続テスト。
- デバイス単位の自動再接続。指数バックオフの待機時間は最大5分。
- 英語・日本語・韓国語・簡体字中国語。トレイ・通知も対応し、OS言語への追従も可能。
- ライト・ダーク・システムテーマ。Windows 11 build 22621以降ではネイティブMica。
- トレイ常駐・通知・設定／履歴／ウィンドウ位置とサイズの保存。
- ドライバーなしで開発・デモができるMockバックエンド。

## スクリーンショット

実際のElectronアプリをMockバックエンドで起動して取得した画面です。

![ライトテーマ](docs/screenshots/devices-light.png)
![ダークテーマ](docs/screenshots/devices-dark.png)

## 動作環境

- Windows 11 x64。
- 開発環境：Node.js 24 LTS、pnpm 10.32.1。
- 実接続：導入済みのusbip-win2クライアント・DLL・ドライバーと、別途構成したUSB/IPサーバー。
- デモモードにはドライバー・管理者権限・USB機器は不要です。

## インストール

ソースからWindowsインストーラーを生成します。

```powershell
pnpm install
pnpm package
```

NSISインストーラーを `release/RemoteUSB-Setup-0.1.3.exe` に生成します。RemoteUSBのリリースビルドは既定では未署名です。

**公式usbip-win2 0.9.8.0 x64セットアップとusbipd-win 5.3.0 x64 MSIを未改変で同梱**しています。インストーラーはSHA-256とAuthenticode署名を確認したうえで、client・署名済みドライバー・serverを公式セットアップから導入します。GitHubからのダウンロードは行いません。

**USB/IPの導入時はUSBハブが再起動し、USB機器が一時的に停止する場合があります。USBストレージへの転送や通話を終えてから実行してください。** RemoteUSBはSecure Bootやテスト署名を変更しません。アンインストール時には、RemoteUSBが導入したUSB/IPコンポーネントを削除するか確認します。RemoteUSBの導入前から存在したコンポーネントは削除しません。

EXE・インストーラー・トレイにはRemoteUSBアイコンを使用し、インストーラーが通知名をRemoteUSBとして登録します。Electron経由の開発起動では通知元の表示が異なる場合があります。

## 開発とデモモード

```powershell
npm.cmd install -g pnpm@10.32.1
pnpm install
pnpm dev:mock
```

実バックエンドは `pnpm dev` で起動します。PowerShellがスクリプトをブロックする場合は `pnpm.cmd`・`npm.cmd` を使えます。実行ポリシーの変更は不要です。

デモではSerial・Arduino・Debug Probe・Smart Card・Printer・Storageのサンプルを操作できます。接続／切断に750 msの遅延があり、設定のデモエラー確率で障害を再現できます。

デモ設定は `demo.json`、実設定は `settings.json` に保存します。実バックエンドに戻すには `--mock` と `REMOTEUSB_BACKEND=mock` を外して再起動してください。ビルド済みアプリは `pnpm exec electron . --mock` でも起動できます。

## USB/IPの設定

1. RemoteUSB-Setup.exeを実行すると、USB/IP client、署名済みclientドライバー、usbipd-win serverが公式セットアップ経由で導入されます。
2. RemoteUSBは同梱backend、インストール済みのupstream配置、`PATH` の順で実行ファイルを検索します。開発や互換性のため、設定で独自の絶対パスも指定できます。
3. USB/IPサーバーでデバイスを共有し、RemoteUSBにホスト名とポートを追加します。既定ポートは3240です。
4. 接続テスト後にデバイス一覧を更新し、接続します。

usbip-win2は**Windowsクライアント**です。旧cezanne版・`usbipd.exe`・`attacher.exe` は同梱しません。CLIのTCPポート指定範囲は1024–65535です。

`pnpm vendor:check-update` で更新を確認し、`pnpm vendor:update` で明示的に更新します。`vendor-lock.json` を確認した後、`pnpm vendor:verify`、`pnpm test`、`pnpm package` を実行してください。ビルド時に最新版を暗黙取得することはありません。[同梱ガイド](vendor/usbip-win2/README.md)・[マニフェスト](vendor/usbip-win2/manifest.json)を参照してください。

## テストとパッケージ作成

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm package
```

単体テストは解析・入力検証・エラー・永続化・サービス・プロセス制限・i18n・React UIを確認します。Electron E2EはMockでサーバー操作・接続・4言語・テーマ保存・125/150/200%表示を確認します。E2Eにはデスクトップセッションが必要です。

Windows CIでlint・型チェック・テスト・ビルド・E2Eを実行します。これらの成功だけでは実USB機器の互換性は保証しません。

## GitHub Release

[Releaseワークフロー](.github/workflows/release.yml)は次の両方に対応します。

- **手動実行：** Actions → Release → Run workflowで対象ブランチを選び、`package.json` と一致するタグ（例：`v0.1.3`）を入力します。検証後、テストしたコミットにタグを作成してReleaseを公開します。
- **タグのpush：** バージョンが一致するタグをpushすると、そのコミットをビルドして公開します。

インストーラー・SHA-256一覧・usbip-win2ソース・ライセンスを添付します。バージョン不一致・別コミットの既存タグ・既存Releaseの上書きは拒否します。リポジトリでActionsを有効にしてください。書き込み権限は公開ジョブだけに付与します。

## 制限事項

- 実ドライバーの導入、実機の接続／切断、ドライバー更新・削除は対象環境での確認が必要です。
- 現在のアプリセッションで開始した接続だけを管理します。ポートと接続先を照合しますが、外部CLIとの同時操作やクラッシュ後の引き継ぎは未対応です。
- COM／PnP照合とカーネルドライバー署名の分類は未実装です。
- 自動再接続にはアプリの継続動作が必要です。ログイン時の自動起動はインストール版で反映します。
- デバイス種別の表示は互換性を保証しません。Webcam・Audio・Capture・Hub・Storageの実動作は未検証です。
- ネイティブ通知・アクセシビリティ設定・Micaは対象Windows環境で確認が必要です。

## トラブルシューティング

| 症状                           | 確認事項                                                     |
| ------------------------------ | ------------------------------------------------------------ |
| USBサポートの設定が必要        | USBip導入、CLIパス、DLL、UDEドライバーを確認                 |
| サーバーがオフライン           | アドレス・ポート・ファイアウォール・共有状態を確認して更新   |
| 接続失敗                       | 他PCの使用状況、物理接続、ドライバー権限を確認し、詳細を表示 |
| Electronが「bad option」を表示 | 起動環境の `ELECTRON_RUN_AS_NODE` を解除                     |
| 設定ファイルの破損             | 元ファイルを `.invalid-*` に保存し、既定値で起動             |

設定とログはElectronの `app.getPath('userData')` 配下に保存します。`REMOTEUSB_DATA_DIR` でテスト用ディレクトリを指定できます。

## 構成とセキュリティ

- `apps/desktop/src/main`：ウィンドウ・トレイ・IPC・サービス・保存・ログ。
- `apps/desktop/src/preload`：サンドボックス化したAPIブリッジ。
- `apps/desktop/src/renderer`：React UI。
- `packages/core`・`packages/shared`・`packages/usb-backend`：モデル・IPC／i18n・実／Mockバックエンド。
- `tests`・`scripts`・`vendor`：検証・パッケージ補助・同梱物。

詳細は[設計資料](docs/architecture.md)を参照してください。context isolationとsandboxを有効にし、Node integrationを無効化しています。IPCを検証し、外部リンクは許可リストで制限します。CLIはshellなしの `execFile`、検証済み引数、既定10秒のタイムアウト、1 MBの出力上限で実行します。USB/IPは信頼するLANやVPNで利用してください。

## ライセンス

RemoteUSB本体は[MIT](LICENSE)です。usbip-win2はBSD-2-Clauseで、著作権表示・ライセンス・未改変インストーラー・対応ソースを同梱します。ソースコピーの公開開発用署名鍵は除外しています。再配布時も同梱の表示を保持してください。[第三者ソフトウェアの表示](THIRD_PARTY_NOTICES.md)を参照してください。

## ローカルUSBの共有

**USB共有**画面から、このPCのUSB機器を一覧表示し、[usbipd-win](https://github.com/dorssel/usbipd-win)で共有・共有解除できます。公式usbipd-win 5.3.0 MSIをvendor/usbipd-winに同梱しています。RemoteUSBのインストーラーがclientとserverを必須構成で順番に導入します。Program FilesまたはPATHから検出します。Bus ID・VID:PID・共有状態・接続中のクライアントを表示します。

共有操作は中央の確認ダイアログで確認し、その操作だけWindows UACで管理者権限を要求します。共有はRemoteUSB終了後も継続し、解除時はリモートクライアントが切断される場合があります。信頼できるネットワークでusbipdサービスとファイアウォールを設定してください。デモモードではPCを変更せず操作を再現します。実機とUAC操作は手動検証が必要です。[実装メモ](docs/usb-server.md)も参照してください。
