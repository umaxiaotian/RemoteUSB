# Architecture

```text
React renderer → sandboxed preload → validated IPC → UsbService
                                                      ├ Store / Logger
                                                      └ UsbBackend
                                                         ├ MockUsbBackend
                                                         └ UsbipWinBackend → execFile → usbip.exe / VHCI
```

`packages/core` はZodによるモデル・設定・永続化スキーマとエラー翻訳、`packages/shared` はIPC契約を持ちます。`packages/usb-backend` はReact/Electronに依存しないアダプターです。packagesは本MVPではソースの責務分割であり、個別の公開npmパッケージではありません。

mainだけがプロセス・ファイル・OS機能にアクセスします。preloadはsandboxで動くよう依存をバンドルし、リクエストとレスポンスを双方検証します。mainは送信元webContents、トップフレーム、URLも確認します。任意のIPC名・URL・プロセス実行APIは公開しません。

デバイス操作にはID単位のロックを設けます。refreshは多重実行をまとめ、途中のConnecting/Disconnectingを上書きしません。接続済みサーバーの編集・削除・無効化は切断後に行います。手動切断では再接続ポリシーをpausedにして、ユーザーの意図に反する再接続を防ぎます。再接続間隔は指数増加し最大5分です。

保存はスキーマ検証→一時ファイル→renameで行います。不正な既存データは `.invalid-<timestamp>` に退避します。将来のスキーマ移行はversionを増やして明示的に実装します。ログは最大2MBでローテーションし、資格情報らしき値をマスクします。

## 追加アダプター

`UsbBackend` を実装し、mainの組み立て箇所で差し替えます。UIのCLI解析・子プロセス呼び出しは不要です。実機固有の接続同一性やPnP照合は新しいアダプター内に閉じ込めます。
