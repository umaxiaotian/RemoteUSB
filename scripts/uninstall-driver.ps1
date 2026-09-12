param([string]$ResultLog)
$ErrorActionPreference = 'Stop'
function Write-RemovalMessage([string]$Message) {
    if ($ResultLog) { Add-Content -LiteralPath $ResultLog -Value $Message -Encoding UTF8 }
    Write-Output $Message
}
try {
    # Elevate the whole script so registry discovery and cleanup use the same context.
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        $powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
        $resultFile = [IO.Path]::GetTempFileName()
        try {
            $child = Start-Process -FilePath $powershell -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $PSCommandPath + '"'), '-ResultLog', ('"' + $resultFile + '"')) -Verb RunAs -WindowStyle Hidden -Wait -PassThru
            # Shell elevation does not inherit nsExec's stdout pipe.
            # Put the final error first because nsExec limits captured output.
            $messages = @(Get-Content -LiteralPath $resultFile -Encoding UTF8 -ErrorAction SilentlyContinue)
            [array]::Reverse($messages)
            $messages | Write-Output
            exit $child.ExitCode
        } finally {
            Remove-Item -LiteralPath $resultFile -ErrorAction SilentlyContinue
        }
    }
    $path = 'HKLM:\Software\RemoteUSB\InstalledComponents'
    $products = @(Get-ItemProperty 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue)
    $clients = @($products | Where-Object { $_.DisplayName -match '^(USBip|usbip-win2)(\s|$)' })
    $entry = Get-ItemProperty -Path $path -Name 'UsbipWin2Uninstaller' -ErrorAction SilentlyContinue
    $directories = @(
        foreach ($client in $clients) { if ($client.InstallLocation) { $client.InstallLocation } }
        if ($entry -and $entry.UsbipWin2Uninstaller) { Split-Path -Parent $entry.UsbipWin2Uninstaller }
        Join-Path $env:ProgramFiles 'USBip'
        if (${env:ProgramW6432}) { Join-Path ${env:ProgramW6432} 'USBip' }
    ) | Select-Object -Unique
    $uninstallers = @(
        foreach ($client in $clients) {
            # Use the registered official Inno Setup uninstaller, including custom locations.
            $command = $client.UninstallString
            if ($command -match '^"([^"\r\n]+\.exe)"(?:\s.*)?$') { $matches[1] }
            elseif ($command -match '^([^"\r\n]+\.exe)(?:\s.*)?$') { $matches[1] }
            # A damaged entry must not prevent processing other valid candidates.
        }
        if ($entry -and (Test-Path -LiteralPath $entry.UsbipWin2Uninstaller)) { $entry.UsbipWin2Uninstaller }
        foreach ($directory in $directories) { Join-Path $directory 'unins000.exe' }
    ) | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -Unique
    $restartRequired = $false
    foreach ($uninstaller in $uninstallers) {
        if (-not (Test-Path -LiteralPath $uninstaller)) { continue }
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
                if (-not $detach.WaitForExit(10000)) { throw 'USBip detach could not be stopped. Driver removal was cancelled; collect diagnostics before restarting Windows.' }
                throw 'USBip detach timed out. Driver removal was cancelled to avoid removing a controller with pending I/O.'
            }
            $detach.Refresh()
            # Process termination does not prove that kernel I/O has drained.
            # Keep the official uninstaller (and its shutdown task) intact on failure.
            if ($detach.ExitCode -ne 0) { throw "USBip detach returned $($detach.ExitCode). Driver removal was cancelled. Repair USBip if its controller is missing, then retry." }
        } elseif (Get-Service -Name usbip2_ude -ErrorAction SilentlyContinue) {
            throw 'USBip CLI is missing while its controller driver remains. Repair USBip before retrying removal.'
        }
        $log = Join-Path $env:TEMP ('RemoteUSB-usbip-uninstall-' + [Guid]::NewGuid() + '.log')
        Write-RemovalMessage "Removing USBip. Log: $log"
        $child = Start-Process -FilePath $uninstaller -ArgumentList @('/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', ('/LOG="' + $log + '"')) -WindowStyle Hidden -PassThru
        $null = $child.Handle
        if (-not $child.WaitForExit(300000)) {
            throw "USBip uninstall has not finished after 5 minutes (PID $($child.Id)). The uninstaller may still be running; do not start another removal or restart Windows while it is active. Collect this log for diagnosis: $log"
        }
        $child.Refresh()
        if ($child.ExitCode -notin @(0, 3010)) { throw "USBip uninstall returned $($child.ExitCode)." }
        # The bundled upstream UninstallNeedRestart always returns true.
        $restartRequired = $true
    }
    if (@($clients | Where-Object { Test-Path -LiteralPath $_.PSPath }).Count -gt 0) {
        throw 'USBip registration remains. Its official uninstaller may be missing or damaged. Repair/reinstall USBip, then retry removal.'
    }
    # Missing uninstall registration is not proof that the component is absent.
    $remainingFiles = @($directories | Where-Object {
        (Test-Path -LiteralPath (Join-Path $_ 'usbip.exe')) -or
        (Test-Path -LiteralPath (Join-Path $_ 'unins000.exe'))
    })
    $remainingDrivers = @(Get-Service -Name usbip2_ude,usbip2_filter -ErrorAction SilentlyContinue)
    if (-not $restartRequired -and ($remainingFiles.Count -gt 0 -or $remainingDrivers.Count -gt 0)) {
        throw 'USBip files or drivers remain without a usable uninstaller. Repair/reinstall USBip, then retry removal.'
    }
    Remove-ItemProperty -Path $path -Name 'UsbipWin2Uninstaller' -ErrorAction SilentlyContinue
    if ($restartRequired) { exit 3010 }
} catch {
    Write-RemovalMessage $_.Exception.Message
    exit 1
}
exit 0
