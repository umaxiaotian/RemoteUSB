# usbip-win2 backend

対象: [vadimgrn/usbip-win2 v.0.9.8.0](https://github.com/vadimgrn/usbip-win2/releases/tag/v.0.9.8.0)。
[旧cezanneリポジトリ](https://github.com/cezanne/usbip-win)もwin2を事実上の後継として案内しています。

## 導入

1. RemoteUSBのインストーラーでUSBipセットアップを選ぶか、Settings/Aboutの同梱USBツールから公式インストーラーを実行します。
2. 管理者権限を承認し、上流セットアップのコンポーネント選択と再起動案内に従います。導入時はUSBハブが再起動するため、USB転送や通話を終えてください。
3. RemoteUSBを起動してRefresh。既定のProgram Files/USBip/usbip.exe、次にPATHを検索します。独自の導入先はSettingsで絶対パスを指定します。DLLをCLIから分離しないでください。
4. USB/IPサーバーを別途設定し、共有したデバイスを追加・接続します。win2にはサーバーusbipd.exeは含まれません。

BSD-2-Clause、対応ソース、未改変公式セットアップは [vendor](../vendor/usbip-win2/README.md) に同梱します。
RemoteUSBはSecure Bootやテスト署名を変更しません。USBipの削除はWindowsのインストール済みアプリから個別に行います。

## 検証したCLI契約

対応タグの以下のソースを確認しています。

- [引数](https://github.com/vadimgrn/usbip-win2/blob/v.0.9.8.0/userspace/usbip/usbip.cpp)
- [list](https://github.com/vadimgrn/usbip-win2/blob/v.0.9.8.0/userspace/usbip/list.cpp)
- [attach](https://github.com/vadimgrn/usbip-win2/blob/v.0.9.8.0/userspace/usbip/attach.cpp)
- [port](https://github.com/vadimgrn/usbip-win2/blob/v.0.9.8.0/userspace/usbip/port.cpp)
- [公式セットアップ](https://github.com/vadimgrn/usbip-win2/blob/v.0.9.8.0/userspace/innosetup/setup.iss)

| 操作 | コマンド |
| --- | --- |
| バージョン | usbip.exe --version |
| 共有一覧 | usbip.exe --tcp-port 3240 list -r host |
| 接続 | usbip.exe --tcp-port 3240 attach -r host -b 1-2 -t |
| 接続一覧 | usbip.exe port |
| 切断 | usbip.exe detach -p 1 |

TCPポートは上流CLIが1024–65535に制限します。listはBus IDとコロンの間に空白を含みます。attachの-tは割り当てポート番号を返します。portは0接続の場合は正常終了・空出力、接続中は「Port 01: device in use at ...」と「usbip://host:service/busid」を出力します。旧版のversionサブコマンド・山括弧形式のport出力・install -uは使用しません。

CLIはshellなし・固定引数・タイムアウト・出力上限付きで起動します。自分のセッションの接続だけを管理し、切断前にポートと接続先を照合します。同一接続先への外部再接続は世代を区別できないため、外部CLIとの同時操作は対象外です。

## 検証範囲

単体テストは新出力形式、空一覧、IPv6、任意TCPポート、ポート再利用時の誤切断防止を検証します。E2EはMockのGUI操作を検証します。配布元ハッシュとインストーラーのAuthenticode署名も確認しています。

実ドライバーの導入、実機attach/detach、再起動後、USBハブ再起動、ドライバー更新/削除、COM/PnP照合は実環境での確認が必要です。インストーラーEXEの署名成功だけでカーネルドライバーの互換性を保証しません。

