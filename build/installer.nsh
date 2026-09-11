!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "LogicLib.nsh"
!ifndef BUILD_UNINSTALLER
Var UsbClientCheckbox
Var UsbServerCheckbox
Var InstallUsbClient
Var InstallUsbServer

!macro customPageAfterChangeDir
  Page custom UsbComponentsPage UsbComponentsLeave
!macroend

Function UsbComponentsPage
  !insertmacro MUI_HEADER_TEXT "USB components / USB機能" "Choose the USB features to install / 導入する機能を選択"
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}
  ${NSD_CreateLabel} 0 0 100% 32u "Official installers are included. Administrator permission is required.$\r$\n公式インストーラーを同梱しています。導入には管理者権限が必要です。"
  Pop $0
  ${NSD_CreateCheckbox} 0 40u 100% 24u "USBip client: use remote USB devices / リモートUSBを利用"
  Pop $UsbClientCheckbox
  ${NSD_CreateCheckbox} 0 74u 100% 24u "usbipd-win server: share this PC's USB devices / このPCのUSBを共有"
  Pop $UsbServerCheckbox
  ${If} $InstallUsbClient == ""
    StrCpy $InstallUsbClient ${BST_CHECKED}
    StrCpy $InstallUsbServer ${BST_CHECKED}
  ${EndIf}
  ${NSD_SetState} $UsbClientCheckbox $InstallUsbClient
  ${NSD_SetState} $UsbServerCheckbox $InstallUsbServer
  ${NSD_CreateLabel} 0 112u 100% 52u "Setup may restart USB devices. Finish USB transfers first. Server setup adds a service and firewall rule; devices are not shared automatically.$\r$\nUSB機器が一時停止する場合があります。共有用サービスとファイアウォール規則を追加しますが、デバイスは自動共有しません。"
  Pop $0
  nsDialogs::Show
FunctionEnd

Function UsbComponentsLeave
  ${NSD_GetState} $UsbClientCheckbox $InstallUsbClient
  ${NSD_GetState} $UsbServerCheckbox $InstallUsbServer
FunctionEnd
!endif

!macro customInstall
  WriteRegStr SHCTX "Software\Classes\AppUserModelId\io.remoteusb.desktop" "DisplayName" "RemoteUSB"
  WriteRegStr SHCTX "Software\Classes\AppUserModelId\io.remoteusb.desktop" "IconUri" "$INSTDIR\resources\branding\icon.png"
  IfSilent usb_setup_done
  ${If} $InstallUsbClient == ${BST_CHECKED}
    DetailPrint "Running USBip client setup..."
    nsExec::ExecToStack '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\resources\driver-setup\install-driver.ps1"'
    Pop $0
    Pop $1
    ${If} $0 != 0
      MessageBox MB_OK|MB_ICONINFORMATION "USBip client setup did not complete. RemoteUSB is installed; retry from the bundled tools folder.$\r$\nクライアントの導入が完了しませんでした。同梱ツールから再実行できます。"
    ${EndIf}
  ${EndIf}
  ${If} $InstallUsbServer == ${BST_CHECKED}
    DetailPrint "Running usbipd-win server setup..."
    nsExec::ExecToStack '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\resources\driver-setup\install-server.ps1"'
    Pop $0
    Pop $1
    ${If} $0 != 0
      MessageBox MB_OK|MB_ICONINFORMATION "usbipd-win setup did not complete. RemoteUSB is installed; retry from the bundled server tools folder.$\r$\n共有機能の導入が完了しませんでした。同梱ツールから再実行できます。"
    ${EndIf}
  ${EndIf}
  usb_setup_done:
!macroend

!macro customUnInstall
  DeleteRegKey SHCTX "Software\Classes\AppUserModelId\io.remoteusb.desktop"
  ; USBip and usbipd-win are independently installed and may be used by other apps.
!macroend

