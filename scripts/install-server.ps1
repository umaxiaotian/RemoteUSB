param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
try {
    $lock = Get-Content -LiteralPath (Join-Path $PSScriptRoot '../vendor-lock.json') -Raw | ConvertFrom-Json
    $entry = $lock.'usbipd-win'
    $installer = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ('../vendor/usbipd-win/' + $entry.asset)))
    if ((Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256) { throw 'usbipd-win installer hash mismatch.' }
    $signature = Get-AuthenticodeSignature -LiteralPath $installer
    if ($signature.Status -ne 'Valid') { throw "Windows could not verify the usbipd-win signature: $($signature.Status)" }
    if ($CheckOnly) { Write-Output 'usbipd-win 5.3.0 MSI hash and signature verified. Nothing installed.'; exit 0 }
    $alreadyInstalled = Get-ItemProperty 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like 'usbipd-win*' } | Select-Object -First 1
    # Install the complete official server MSI without leaving optional features
    # to a user-driven wizard selection.
    $msiexec = Join-Path $env:SystemRoot 'System32/msiexec.exe'
    $child = Start-Process -FilePath $msiexec -ArgumentList @('/i', ('"' + $installer + '"'), '/qn', '/norestart') -Verb RunAs -WindowStyle Hidden -Wait -PassThru
    if ($child.ExitCode -eq 3010) {
        Add-Type -AssemblyName System.Windows.Forms
        [Windows.Forms.MessageBox]::Show('usbipd-win installed. Restart Windows to finish setup.', 'RemoteUSB') | Out-Null
    } elseif ($child.ExitCode -ne 0) { throw "usbipd-win setup returned $($child.ExitCode). Installation may have been cancelled. You can retry from the bundled server tools folder." }
    $product = Get-ItemProperty 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like 'usbipd-win*' } | Select-Object -First 1
    if ($product.PSPath -and -not $alreadyInstalled) {
        New-Item -Path 'HKLM:\Software\RemoteUSB\InstalledComponents' -Force | Out-Null
        New-ItemProperty -Path 'HKLM:\Software\RemoteUSB\InstalledComponents' -Name 'UsbipdWinProductCode' -Value $product.PSChildName -PropertyType String -Force | Out-Null
    }
} catch {
    if ($CheckOnly) { Write-Output $_.Exception.Message } else {
        Add-Type -AssemblyName System.Windows.Forms
        [Windows.Forms.MessageBox]::Show($_.Exception.Message, 'RemoteUSB - usbipd-win setup') | Out-Null
    }
    exit 1
}
