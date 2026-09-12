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
    $servers = @($products | Where-Object { $_.DisplayName -like 'usbipd-win*' })
    # The MSI API can still discover products when the Apps registry entry is damaged.
    $windowsInstaller = New-Object -ComObject WindowsInstaller.Installer
    $knownCodes = @($servers | ForEach-Object { $_.PSChildName })
    foreach ($product in $windowsInstaller.ProductsEx('', '', 4)) {
        if ($product.InstallProperty('ProductName') -like 'usbipd-win*' -and $product.ProductCode -notin $knownCodes) {
            $servers += [pscustomobject]@{
                PSChildName = $product.ProductCode
                PSPath = $null
                InstallLocation = $product.InstallProperty('InstallLocation')
            }
        }
    }
    $msiexec = Join-Path $env:SystemRoot 'System32\msiexec.exe'
    $restartRequired = $false
    # Disconnect active sessions before asking the CLI or MSI to remove devices.
    $service = Get-Service -Name usbipd -ErrorAction SilentlyContinue
    if ($service -and $service.Status -ne 'Stopped') {
        Write-RemovalMessage 'Stopping usbipd service...'
        if ($service.Status -ne 'StopPending') { $service.Stop() }
        $service.WaitForStatus([ServiceProcess.ServiceControllerStatus]::Stopped, [TimeSpan]::FromSeconds(30))
    }
    foreach ($server in $servers) {
        if ($server.PSChildName -notmatch '^\{[0-9A-Fa-f-]{36}\}$') {
            # This may be an auxiliary entry removed by the official MSI.
            Write-RemovalMessage "Deferring non-MSI registration check: $($server.PSChildName)"
            continue
        }
        $directories = @(
            if ($server.InstallLocation) { $server.InstallLocation }
            Join-Path $env:ProgramFiles 'usbipd-win'
        )
        $usbipd = $directories | ForEach-Object { Join-Path $_ 'usbipd.exe' } | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
        # Restore shared/forced-bound devices before removing the server drivers.
        if ($usbipd) {
            foreach ($operation in @('unbind')) {
                $prepare = Start-Process -FilePath $usbipd -ArgumentList @($operation, '--all') -WindowStyle Hidden -PassThru
                $null = $prepare.Handle
                if (-not $prepare.WaitForExit(30000)) {
                    $prepare.Kill()
                    if (-not $prepare.WaitForExit(10000)) { throw "usbipd $operation could not be stopped. Server removal was cancelled; collect diagnostics before restarting Windows." }
                    throw "usbipd $operation timed out. Server removal was cancelled because device restoration did not finish."
                }
                $prepare.Refresh()
                if ($prepare.ExitCode -ne 0) { throw "usbipd $operation returned $($prepare.ExitCode). Server removal was cancelled. Repair usbipd-win before retrying." }
            }
        }
        $log = Join-Path $env:TEMP ('RemoteUSB-usbipd-uninstall-' + [Guid]::NewGuid() + '.log')
        Write-RemovalMessage "Removing usbipd-win. Log: $log"
        $child = Start-Process -FilePath $msiexec -ArgumentList @('/x', $server.PSChildName, '/qn', '/norestart', '/L*v', ('"' + $log + '"')) -WindowStyle Hidden -PassThru
        $null = $child.Handle
        if (-not $child.WaitForExit(300000)) {
            # Do not kill Windows Installer mid-transaction.
            throw "usbipd-win uninstall has not finished after 5 minutes (PID $($child.Id)). Windows Installer may still be running; do not start another removal or restart Windows while it is active. Collect this log for diagnosis: $log"
        }
        $child.Refresh()
        if ($child.ExitCode -notin @(0, 1605, 3010)) { throw "usbipd-win uninstall returned $($child.ExitCode)." }
        if ($child.ExitCode -eq 3010) { $restartRequired = $true }
    }
    # Inspect current state, not the pre-uninstall snapshot. Auxiliary entries
    # without a product-code key can disappear during a successful MSI removal.
    $remainingProducts = @(Get-ItemProperty 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue |
        Where-Object { $_.DisplayName -like 'usbipd-win*' })
    $remainingMsiCodes = @(
        foreach ($product in $windowsInstaller.ProductsEx('', '', 4)) {
            if ($product.InstallProperty('ProductName') -like 'usbipd-win*') { $product.ProductCode }
        }
    )
    if ($remainingProducts.Count -gt 0 -or $remainingMsiCodes.Count -gt 0) {
        $remainingKeys = ($remainingProducts | ForEach-Object { $_.PSPath }) -join '; '
        throw "usbipd-win registration remains after removal. Registry: $remainingKeys MSI: $($remainingMsiCodes -join ', '). Repair/reinstall usbipd-win, then retry removal."
    }
    $remainingService = Get-Service -Name usbipd -ErrorAction SilentlyContinue
    $serverFile = Join-Path $env:ProgramFiles 'usbipd-win/usbipd.exe'
    if (-not $restartRequired -and ($remainingService -or (Test-Path -LiteralPath $serverFile))) {
        throw 'usbipd-win service, driver or files remain. Repair/reinstall usbipd-win, then retry removal.'
    }
    Remove-ItemProperty -Path $path -Name 'UsbipdWinProductCode' -ErrorAction SilentlyContinue
    if ($restartRequired) { exit 3010 }
} catch {
    Write-RemovalMessage $_.Exception.Message
    exit 1
}
exit 0
