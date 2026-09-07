!macro customInstall
  WriteRegStr SHCTX "Software\Classes\AppUserModelId\io.remoteusb.desktop" "DisplayName" "RemoteUSB"
  WriteRegStr SHCTX "Software\Classes\AppUserModelId\io.remoteusb.desktop" "IconUri" "$INSTDIR\resources\branding\icon.png"
  ; Optional, interactive only. Never change boot security or import certificates.
  IfSilent driver_done
  MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "Run the bundled official USBip 0.9.8.0 setup? (Administrator permission required)$\r$\n$\r$\nThis installs the usbip-win2 client and drivers. USB hubs may restart, briefly interrupting USB devices. Finish USB storage transfers and calls first. Follow the upstream setup screens.$\r$\n$\r$\n公式USBipセットアップを起動しますか？ 管理者権限が必要です。導入中はUSB機器が一時的に停止します。" IDNO driver_done
  ClearErrors
  ExecShell "runas" "$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\resources\driver-setup\install-driver.ps1"' SW_HIDE
  IfErrors 0 driver_done
  MessageBox MB_OK|MB_ICONINFORMATION "Driver setup was not started. RemoteUSB is installed; you can retry from resources\driver-setup\install-driver.ps1."
  driver_done:
!macroend

!macro customUnInstall
  DeleteRegKey SHCTX "Software\Classes\AppUserModelId\io.remoteusb.desktop"
  ; Drivers may be shared by other USB/IP clients. Do not remove them here.
!macroend
