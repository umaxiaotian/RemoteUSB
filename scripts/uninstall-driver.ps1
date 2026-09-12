$ErrorActionPreference = 'Stop'
try {
    # Elevate the whole script so registry discovery and cleanup use the same context.
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        $powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
        $child = Start-Process -FilePath $powershell -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $PSCommandPath + '"')) -Verb RunAs -WindowStyle Hidden -Wait -PassThru
        exit $child.ExitCode
    }
    $path = 'HKLM:\Software\RemoteUSB\InstalledComponents'
    $products = @(Get-ItemProperty 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue)
    $clients = @($products | Where-Object { $_.DisplayName -match '^(USBip|usbip-win2)(\s|$)' })
    $uninstallers = @(
        foreach ($client in $clients) {
            # Use the registered official Inno Setup uninstaller, including custom locations.
            $command = $client.UninstallString
            if ($command -match '^"([^"\r\n]+\.exe)"(?:\s.*)?$') { $matches[1] }
            elseif ($command -match '^([^"\r\n]+\.exe)(?:\s.*)?$') { $matches[1] }
            else { throw 'Could not locate the registered USBip uninstaller.' }
        }
        $entry = Get-ItemProperty -Path $path -Name 'UsbipWin2Uninstaller' -ErrorAction SilentlyContinue
        if ($entry -and (Test-Path -LiteralPath $entry.UsbipWin2Uninstaller)) { $entry.UsbipWin2Uninstaller }
    ) | Select-Object -Unique
    foreach ($uninstaller in $uninstallers) {
        if (-not (Test-Path -LiteralPath $uninstaller)) { throw "USBip uninstaller is missing: $uninstaller" }
        $child = Start-Process -FilePath $uninstaller -ArgumentList @('/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART') -WindowStyle Hidden -Wait -PassThru
        if ($child.ExitCode -ne 0) { throw "USBip uninstall returned $($child.ExitCode)." }
    }
    Remove-ItemProperty -Path $path -Name 'UsbipWin2Uninstaller' -ErrorAction SilentlyContinue
} catch {
    Write-Output $_.Exception.Message
    exit 1
}
exit 0
