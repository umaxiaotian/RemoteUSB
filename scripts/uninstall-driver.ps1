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
    $restartRequired = $false
    foreach ($uninstaller in $uninstallers) {
        if (-not (Test-Path -LiteralPath $uninstaller)) { throw "USBip uninstaller is missing: $uninstaller" }
        $installDirectory = Split-Path -Parent $uninstaller
        # Stop only the upstream client processes from this installation. In
        # particular, wusbip can automatically reconnect devices after detach.
        $clientPaths = @((Join-Path $installDirectory 'usbip.exe'), (Join-Path $installDirectory 'wusbip.exe'))
        Get-Process -Name usbip,wusbip -ErrorAction SilentlyContinue | Where-Object {
            $_.Path -in $clientPaths
        } | ForEach-Object {
            Stop-Process -Id $_.Id -Force -ErrorAction Stop
            if (-not $_.WaitForExit(10000)) { throw 'USBip process did not stop.' }
        }
        $usbip = Join-Path $installDirectory 'usbip.exe'
        if (Test-Path -LiteralPath $usbip) {
            $detach = Start-Process -FilePath $usbip -ArgumentList @('detach', '--all') -WindowStyle Hidden -PassThru
            $null = $detach.Handle
            if (-not $detach.WaitForExit(30000)) {
                $detach.Kill()
                throw 'USBip detach timed out. Component removal was not started.'
            }
            $detach.Refresh()
            # A missing/already removed virtual controller can make detach fail.
            # Still let the official uninstaller repair this partial state.
            if ($detach.ExitCode -ne 0) { Write-Output "USBip detach returned $($detach.ExitCode); continuing with the official uninstaller." }
        }
        $child = Start-Process -FilePath $uninstaller -ArgumentList @('/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART') -WindowStyle Hidden -Wait -PassThru
        if ($child.ExitCode -notin @(0, 3010)) { throw "USBip uninstall returned $($child.ExitCode)." }
        # The bundled upstream UninstallNeedRestart always returns true.
        $restartRequired = $true
    }
    if (@($clients | Where-Object { Test-Path -LiteralPath $_.PSPath }).Count -gt 0) {
        throw 'USBip is still registered after its uninstaller finished.'
    }
    Remove-ItemProperty -Path $path -Name 'UsbipWin2Uninstaller' -ErrorAction SilentlyContinue
    if ($restartRequired) { exit 3010 }
} catch {
    Write-Output $_.Exception.Message
    exit 1
}
exit 0
