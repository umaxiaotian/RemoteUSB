# Launch the unmodified official usbip-win2 installer, never a raw driver command.
param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$vendor = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../vendor/usbip-win2'))
try {
    $lock = Get-Content -LiteralPath (Join-Path $PSScriptRoot '../vendor-lock.json') -Raw | ConvertFrom-Json
    $entry = $lock.'usbip-win2'
    $installer = Join-Path $vendor $entry.asset
    if ((Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256) { throw 'USBip installer hash mismatch.' }
    $signature = Get-AuthenticodeSignature -LiteralPath $installer
    if ($signature.Status -ne 'Valid') { throw "Windows could not verify the official USBip installer signature: $($signature.Status)" }
    if ($CheckOnly) { Write-Output 'Official USBip 0.9.8.0 installer hash and signature verified. Nothing installed.'; exit 0 }
    $installRoot = Join-Path ${env:ProgramW6432} 'USBip'
    if (-not (Test-Path -LiteralPath $installRoot)) { $installRoot = Join-Path ${env:ProgramFiles} 'USBip' }
    $alreadyInstalled = Test-Path -LiteralPath (Join-Path $installRoot 'unins000.exe')
    # Install the CLI, DLLs, required client drivers and VC++ runtime without
    # allowing the upstream wizard to leave the client partially installed.
    $child = Start-Process -FilePath $installer -ArgumentList @('/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/COMPONENTS=main,client', '/TASKS=vcredist') -Verb RunAs -WindowStyle Hidden -Wait -PassThru
    if ($child.ExitCode -ne 0) { throw "USBip setup returned $($child.ExitCode). Setup may have been cancelled; see the upstream setup result." }
    $uninstaller = Join-Path ([IO.Path]::GetDirectoryName($installer)) 'unins000.exe'
    if (-not (Test-Path -LiteralPath $installRoot)) { $installRoot = Join-Path ${env:ProgramFiles} 'USBip' }
    if (Test-Path -LiteralPath (Join-Path $installRoot 'unins000.exe')) { $uninstaller = Join-Path $installRoot 'unins000.exe' }
    if (-not $alreadyInstalled) {
        New-Item -Path 'HKLM:\Software\RemoteUSB\InstalledComponents' -Force | Out-Null
        New-ItemProperty -Path 'HKLM:\Software\RemoteUSB\InstalledComponents' -Name 'UsbipWin2Uninstaller' -Value $uninstaller -PropertyType String -Force | Out-Null
    }
} catch {
    if ($CheckOnly) { Write-Output $_.Exception.Message } else {
        Add-Type -AssemblyName System.Windows.Forms
        [Windows.Forms.MessageBox]::Show($_.Exception.Message, 'RemoteUSB - USBip setup') | Out-Null
    }
    exit 1
}
