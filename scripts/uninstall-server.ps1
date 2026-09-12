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
    foreach ($server in $servers) {
        if ($server.PSChildName -notmatch '^\{[0-9A-Fa-f-]{36}\}$') { throw 'Invalid usbipd-win MSI product code.' }
        $child = Start-Process -FilePath $msiexec -ArgumentList @('/x', $server.PSChildName, '/qn', '/norestart') -WindowStyle Hidden -Wait -PassThru
        if ($child.ExitCode -notin @(0, 1605, 3010)) { throw "usbipd-win uninstall returned $($child.ExitCode)." }
        if ($child.ExitCode -eq 3010) {
            Add-Type -AssemblyName System.Windows.Forms
            [Windows.Forms.MessageBox]::Show($(if ((Get-UICulture).TwoLetterISOLanguageName -eq 'ja') { 'usbipd-win の削除を完了するには Windows を再起動してください。' } else { 'Restart Windows to finish removing usbipd-win.' }), 'RemoteUSB') | Out-Null
        }
    }
    Remove-ItemProperty -Path $path -Name 'UsbipdWinProductCode' -ErrorAction SilentlyContinue
} catch {
    Write-Output $_.Exception.Message
    exit 1
}
exit 0
