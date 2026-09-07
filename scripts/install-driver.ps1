# Launch the unmodified official usbip-win2 installer, never a raw driver command.
param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$vendor = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../vendor/usbip-win2'))
try {
    $installer = Join-Path $vendor 'USBip-0.9.8.0-x64.exe'
    if ((Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash -ne '81f426741f7ee2ed991febe24a22daca8400b6ae2f171054e3fb404897e15d39') { throw 'USBip installer hash mismatch.' }
    $signature = Get-AuthenticodeSignature -LiteralPath $installer
    if ($signature.Status -ne 'Valid') { throw "Windows could not verify the official USBip installer signature: $($signature.Status)" }
    if ($CheckOnly) { Write-Output 'Official USBip 0.9.8.0 installer hash and signature verified. Nothing installed.'; exit 0 }
    # Keep upstream UI, license, component selection and reboot handling visible.
    $child = Start-Process -FilePath $installer -Verb RunAs -WindowStyle Normal -Wait -PassThru
    if ($child.ExitCode -ne 0) { throw "USBip setup returned $($child.ExitCode). Setup may have been cancelled; see the upstream setup result." }
} catch {
    if ($CheckOnly) { Write-Output $_.Exception.Message } else {
        Add-Type -AssemblyName System.Windows.Forms
        [Windows.Forms.MessageBox]::Show($_.Exception.Message, 'RemoteUSB - USBip setup') | Out-Null
    }
    exit 1
}
