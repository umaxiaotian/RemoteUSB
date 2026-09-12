!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "LogicLib.nsh"
!ifndef BUILD_UNINSTALLER
!macro customPageAfterChangeDir
  Page custom UsbComponentsPage UsbComponentsLeave
!macroend

Function UsbComponentsPage
  !insertmacro MUI_HEADER_TEXT "USB components / USB機能" "Required USB/IP components / 必須USB/IPコンポーネント"
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}
  ${NSD_CreateLabel} 0 0 100% 80u "The required USB/IP client, signed client drivers and server are included and will be installed by their official installers. Administrator permission is required.$\r$\nUSB/IPクライアント、署名済みクライアントドライバー、サーバーを同梱しています。公式インストーラーで必須構成を導入します。管理者権限が必要です。"
  Pop $0
  ${NSD_CreateLabel} 0 92u 100% 52u "Setup may restart USB devices. Finish USB transfers first. The server service and firewall rule are installed, but devices are not shared automatically.$\r$\nUSB機器が一時停止する場合があります。USB転送を終えてください。共有用サービスとファイアウォール規則を導入しますが、デバイスは自動共有しません。"
  Pop $0
  nsDialogs::Show
FunctionEnd

Function UsbComponentsLeave
FunctionEnd
!endif

!macro customInstall
  WriteRegStr SHCTX "Software\Classes\AppUserModelId\io.remoteusb.desktop" "DisplayName" "RemoteUSB"
  WriteRegStr SHCTX "Software\Classes\AppUserModelId\io.remoteusb.desktop" "IconUri" "$INSTDIR\resources\branding\icon.png"
  ; Run both official installers for every installation mode.
  DetailPrint "Running usbipd-win server setup..."
  nsExec::ExecToStack '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\resources\driver-setup\install-server.ps1"'
  Pop $0
  Pop $1
  ${If} $0 != 0
    MessageBox MB_OK|MB_ICONSTOP "usbipd-win setup failed. RemoteUSB installation cannot continue.$\r$\nサーバーの導入に失敗したため、RemoteUSBのインストールを続行できません。"
    Abort
  ${EndIf}
  DetailPrint "Running USBip client and driver setup..."
  nsExec::ExecToStack '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\resources\driver-setup\install-driver.ps1"'
  Pop $0
  Pop $1
  ${If} $0 != 0
    MessageBox MB_OK|MB_ICONSTOP "USBip client or driver setup failed. RemoteUSB installation cannot continue.$\r$\nクライアントまたはドライバーの導入に失敗したため、RemoteUSBのインストールを続行できません。"
    Abort
  ${EndIf}
!macroend

!macro customUnInstall
  DeleteRegKey SHCTX "Software\Classes\AppUserModelId\io.remoteusb.desktop"
  IfSilent usb_uninstall_done
  MessageBox MB_YESNO|MB_ICONQUESTION "Remove the USB/IP client, signed driver and server installed by RemoteUSB? Existing components not installed by RemoteUSB will not be removed.$\r$\nRemoteUSBが導入したUSB/IPクライアント、署名済みドライバー、サーバーを削除しますか？RemoteUSB以外が導入したコンポーネントは削除しません。" IDNO usb_uninstall_done IDYES usb_remove_components
  usb_remove_components:
  nsExec::ExecToStack '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\resources\driver-setup\uninstall-server.ps1"'
  Pop $0
  Pop $1
  nsExec::ExecToStack '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\resources\driver-setup\uninstall-driver.ps1"'
  Pop $0
  Pop $1
  usb_uninstall_done:
!macroend

