$ErrorActionPreference = 'Stop'
try {
    $path = 'HKLM:\Software\RemoteUSB\InstalledComponents'
    $entry = Get-ItemProperty -Path $path -Name 'UsbipWin2Uninstaller' -ErrorAction SilentlyContinue
    if (-not $entry) { exit 0 }
    if (-not (Test-Path -LiteralPath $entry.UsbipWin2Uninstaller)) { exit 0 }
    $child = Start-Process -FilePath $entry.UsbipWin2Uninstaller -ArgumentList @('/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART') -Verb RunAs -WindowStyle Hidden -Wait -PassThru
    if ($child.ExitCode -ne 0) { throw "USBip uninstall returned $($child.ExitCode)." }
    Remove-ItemProperty -Path $path -Name 'UsbipWin2Uninstaller' -ErrorAction SilentlyContinue
} catch {
    Add-Type -AssemblyName System.Windows.Forms
    [Windows.Forms.MessageBox]::Show($_.Exception.Message, 'RemoteUSB - USBip uninstall') | Out-Null
    exit 1
}