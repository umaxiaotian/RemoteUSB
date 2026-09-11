param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
try {
    $installer = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../vendor/usbipd-win/usbipd-win_5.3.0_x64.msi'))
    if ((Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash -ne '1c984914aec944de19b64eff232421439629699f8138e3ddc29301175bc6d938') { throw 'usbipd-win installer hash mismatch.' }
    $signature = Get-AuthenticodeSignature -LiteralPath $installer
    if ($signature.Status -ne 'Valid') { throw "Windows could not verify the usbipd-win signature: $($signature.Status)" }
    if ($CheckOnly) { Write-Output 'usbipd-win 5.3.0 MSI hash and signature verified. Nothing installed.'; exit 0 }
    # Keep the official MSI wizard visible, including maintenance/upgrade and UAC prompts.
    $msiexec = Join-Path $env:SystemRoot 'System32/msiexec.exe'
    $child = Start-Process -FilePath $msiexec -ArgumentList @('/i', ('"' + $installer + '"'), '/norestart') -Verb RunAs -WindowStyle Normal -Wait -PassThru
    if ($child.ExitCode -eq 3010) {
        Add-Type -AssemblyName System.Windows.Forms
        [Windows.Forms.MessageBox]::Show('usbipd-win installed. Restart Windows to finish setup.', 'RemoteUSB') | Out-Null
    } elseif ($child.ExitCode -ne 0) { throw "usbipd-win setup returned $($child.ExitCode). Installation may have been cancelled. You can retry from the bundled server tools folder." }
} catch {
    if ($CheckOnly) { Write-Output $_.Exception.Message } else {
        Add-Type -AssemblyName System.Windows.Forms
        [Windows.Forms.MessageBox]::Show($_.Exception.Message, 'RemoteUSB - usbipd-win setup') | Out-Null
    }
    exit 1
}
