!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "LogicLib.nsh"

; Keep each page in one language; Windows selects the supported UI language.
LangString UsbTitle 1033 "USB components"
LangString UsbTitle 1041 "USB コンポーネント"
LangString UsbSubtitle 1033 "Required USB/IP client, drivers and server"
LangString UsbSubtitle 1041 "必要な USB/IP クライアント、ドライバー、サーバー"
LangString UsbIncluded 1033 "Setup includes the USBip (usbip-win2) client, signed client drivers and usbipd-win server. Their official installers will run automatically."
LangString UsbIncluded 1041 "USBip (usbip-win2) クライアント、署名済みドライバー、usbipd-win サーバーを同梱しています。公式インストーラーが自動的に実行されます。"
LangString UsbAdmin 1033 "Administrator permission is required to install these components."
LangString UsbAdmin 1041 "これらのコンポーネントの導入には管理者権限が必要です。"
LangString UsbRestart 1033 "USB devices may restart during setup. Finish all USB transfers before continuing."
LangString UsbRestart 1041 "セットアップ中に USB 機器が再起動する場合があります。続行する前に USB 転送を終了してください。"
LangString UsbSharing 1033 "Setup installs the server service and firewall rule. Devices are not shared automatically."
LangString UsbSharing 1041 "サーバーサービスとファイアウォール規則を導入します。デバイスは自動的には共有されません。"
LangString UsbServerInstall 1033 "Running usbipd-win server setup..."
LangString UsbServerInstall 1041 "usbipd-win サーバーをインストールしています..."
LangString UsbClientInstall 1033 "Running USBip client and driver setup..."
LangString UsbClientInstall 1041 "USBip クライアントとドライバーをインストールしています..."
LangString UsbServerInstallError 1033 "usbipd-win setup failed. RemoteUSB installation cannot continue."
LangString UsbServerInstallError 1041 "usbipd-win の導入に失敗しました。RemoteUSB のインストールを続行できません。"
LangString UsbClientInstallError 1033 "USBip client or driver setup failed. RemoteUSB installation cannot continue."
LangString UsbClientInstallError 1041 "USBip クライアントまたはドライバーの導入に失敗しました。RemoteUSB のインストールを続行できません。"
LangString UsbRemovePrompt 1033 "Also uninstall USBip (usbip-win2), its client drivers and the usbipd-win server?$\r$\n$\r$\nThis includes components installed before RemoteUSB. Other applications may use them. Select No to keep them."
LangString UsbRemovePrompt 1041 "USBip (usbip-win2)、クライアントドライバー、usbipd-win サーバーも削除しますか？$\r$\n$\r$\nRemoteUSB より前に導入されたものも削除対象です。他のアプリが使用している場合があります。残す場合は「いいえ」を選択してください。"
LangString UsbServerRemove 1033 "Uninstalling usbipd-win..."
LangString UsbServerRemove 1041 "usbipd-win を削除しています..."
LangString UsbClientRemove 1033 "Uninstalling USBip and its client drivers..."
LangString UsbClientRemove 1041 "USBip とクライアントドライバーを削除しています..."
LangString UsbServerRemoveError 1033 "usbipd-win could not be removed. You can retry from Windows Settings > Apps > Installed apps."
LangString UsbServerRemoveError 1041 "usbipd-win を削除できませんでした。Windows の「設定」>「アプリ」>「インストールされているアプリ」から再試行できます。"
LangString UsbClientRemoveError 1033 "USBip or its client drivers could not be removed. You can retry from Windows Settings > Apps > Installed apps."
LangString UsbClientRemoveError 1041 "USBip またはクライアントドライバーを削除できませんでした。Windows の「設定」>「アプリ」>「インストールされているアプリ」から再試行できます。"

!ifndef BUILD_UNINSTALLER
!macro customPageAfterChangeDir
  Page custom UsbComponentsPage
!macroend

Function UsbComponentsPage
  !insertmacro MUI_HEADER_TEXT "$(UsbTitle)" "$(UsbSubtitle)"
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}
  ${NSD_CreateLabel} 0 0 100% 30u "$(UsbIncluded)"
  Pop $0
  ${NSD_CreateLabel} 0 40u 100% 20u "$(UsbAdmin)"
  Pop $0
  ${NSD_CreateLabel} 0 70u 100% 30u "$(UsbRestart)"
  Pop $0
  ${NSD_CreateLabel} 0 110u 100% 30u "$(UsbSharing)"
  Pop $0
  nsDialogs::Show
FunctionEnd
!endif

!macro customInstall
  WriteRegStr SHCTX "Software\Classes\AppUserModelId\io.remoteusb.desktop" "DisplayName" "RemoteUSB"
  WriteRegStr SHCTX "Software\Classes\AppUserModelId\io.remoteusb.desktop" "IconUri" "$INSTDIR\resources\branding\icon.png"
  ; Run both official installers for every installation mode.
  DetailPrint "$(UsbServerInstall)"
  nsExec::ExecToStack '"$WINDIR\Sysnative\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\resources\driver-setup\install-server.ps1"'
  Pop $0
  Pop $1
  ${If} $0 != 0
    MessageBox MB_OK|MB_ICONSTOP "$(UsbServerInstallError)"
    Abort
  ${EndIf}
  DetailPrint "$(UsbClientInstall)"
  nsExec::ExecToStack '"$WINDIR\Sysnative\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\resources\driver-setup\install-driver.ps1"'
  Pop $0
  Pop $1
  ${If} $0 != 0
    MessageBox MB_OK|MB_ICONSTOP "$(UsbClientInstallError)"
    Abort
  ${EndIf}
!macroend

!macro customUnInstall
  DeleteRegKey SHCTX "Software\Classes\AppUserModelId\io.remoteusb.desktop"
  ${If} ${isUpdated}
    Goto usb_uninstall_done
  ${EndIf}
  IfSilent usb_uninstall_done
  MessageBox MB_YESNO|MB_DEFBUTTON2|MB_ICONQUESTION "$(UsbRemovePrompt)" IDNO usb_uninstall_done IDYES usb_remove_components
  usb_remove_components:
  DetailPrint "$(UsbServerRemove)"
  nsExec::ExecToStack '"$WINDIR\Sysnative\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\resources\driver-setup\uninstall-server.ps1"'
  Pop $0
  Pop $1
  ${If} $0 != 0
    MessageBox MB_OK|MB_ICONEXCLAMATION "$(UsbServerRemoveError)"
  ${EndIf}
  DetailPrint "$(UsbClientRemove)"
  nsExec::ExecToStack '"$WINDIR\Sysnative\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\resources\driver-setup\uninstall-driver.ps1"'
  Pop $0
  Pop $1
  ${If} $0 != 0
    MessageBox MB_OK|MB_ICONEXCLAMATION "$(UsbClientRemoveError)"
  ${EndIf}
  usb_uninstall_done:
!macroend
