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
    $invalidRegistration = $false
    foreach ($server in $servers) {
        if ($server.PSChildName -notmatch '^\{[0-9A-Fa-f-]{36}\}$') {
            $invalidRegistration = $true
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
                    if (-not $prepare.WaitForExit(10000)) { throw "usbipd $operation could not be stopped. Restart Windows and retry removal." }
                    Write-RemovalMessage "usbipd $operation timed out; continuing with the official uninstaller."
                }
                $prepare.Refresh()
                if ($prepare.ExitCode -ne 0) { Write-RemovalMessage "usbipd $operation returned $($prepare.ExitCode); continuing with the official uninstaller." }
            }
        }
        $log = Join-Path $env:TEMP ('RemoteUSB-usbipd-uninstall-' + [Guid]::NewGuid() + '.log')
        Write-RemovalMessage "Removing usbipd-win. Log: $log"
        $child = Start-Process -FilePath $msiexec -ArgumentList @('/x', $server.PSChildName, '/qn', '/norestart', '/L*v', ('"' + $log + '"')) -WindowStyle Hidden -PassThru
        $null = $child.Handle
        if (-not $child.WaitForExit(300000)) {
            # Do not kill Windows Installer mid-transaction.
            throw "usbipd-win uninstall has not finished after 5 minutes (PID $($child.Id)). Restart Windows before retrying. Log: $log"
        }
        $child.Refresh()
        if ($child.ExitCode -notin @(0, 1605, 3010)) { throw "usbipd-win uninstall returned $($child.ExitCode)." }
        if ($child.ExitCode -eq 3010) { $restartRequired = $true }
        if ($server.PSPath -and (Test-Path -LiteralPath $server.PSPath)) { throw 'usbipd-win is still registered after its uninstaller finished.' }
    }
    if ($invalidRegistration) { throw 'A damaged usbipd-win registration remains. Repair/reinstall usbipd-win, then retry removal.' }
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
