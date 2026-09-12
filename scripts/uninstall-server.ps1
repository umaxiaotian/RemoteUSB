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
    $servers = @($products | Where-Object { $_.DisplayName -like 'usbipd-win*' })
    $msiexec = Join-Path $env:SystemRoot 'System32\msiexec.exe'
    $restartRequired = $false
    foreach ($server in $servers) {
        if ($server.PSChildName -notmatch '^\{[0-9A-Fa-f-]{36}\}$') { throw 'Invalid usbipd-win MSI product code.' }
        $directories = @(
            if ($server.InstallLocation) { $server.InstallLocation }
            Join-Path $env:ProgramFiles 'usbipd-win'
        )
        $usbipd = $directories | ForEach-Object { Join-Path $_ 'usbipd.exe' } | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
        # Restore shared/forced-bound devices before removing the server drivers.
        if ($usbipd) {
            foreach ($operation in @('detach', 'unbind')) {
                $prepare = Start-Process -FilePath $usbipd -ArgumentList @($operation, '--all') -WindowStyle Hidden -PassThru
                $null = $prepare.Handle
                if (-not $prepare.WaitForExit(30000)) {
                    $prepare.Kill()
                    throw "usbipd $operation timed out. Component removal was not started."
                }
                $prepare.Refresh()
                if ($prepare.ExitCode -ne 0) { Write-Output "usbipd $operation returned $($prepare.ExitCode); continuing with the official uninstaller." }
            }
        }
        $service = Get-Service -Name usbipd -ErrorAction SilentlyContinue
        if ($service -and $service.Status -ne 'Stopped') {
            Stop-Service -InputObject $service -ErrorAction Stop
            $service.WaitForStatus([ServiceProcess.ServiceControllerStatus]::Stopped, [TimeSpan]::FromSeconds(30))
        }
        $child = Start-Process -FilePath $msiexec -ArgumentList @('/x', $server.PSChildName, '/qn', '/norestart') -WindowStyle Hidden -Wait -PassThru
        if ($child.ExitCode -notin @(0, 1605, 3010)) { throw "usbipd-win uninstall returned $($child.ExitCode)." }
        if ($child.ExitCode -eq 3010) { $restartRequired = $true }
        if (Test-Path -LiteralPath $server.PSPath) { throw 'usbipd-win is still registered after its uninstaller finished.' }
    }
    Remove-ItemProperty -Path $path -Name 'UsbipdWinProductCode' -ErrorAction SilentlyContinue
    if ($restartRequired) { exit 3010 }
} catch {
    Write-Output $_.Exception.Message
    exit 1
}
exit 0
