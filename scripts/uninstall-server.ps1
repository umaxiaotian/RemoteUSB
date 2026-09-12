$ErrorActionPreference = 'Stop'
try {
    $path = 'HKLM:\Software\RemoteUSB\InstalledComponents'
    $entry = Get-ItemProperty -Path $path -Name 'UsbipdWinProductCode' -ErrorAction SilentlyContinue
    if (-not $entry) { exit 0 }
    $msiexec = Join-Path $env:SystemRoot 'System32\msiexec.exe'
    $child = Start-Process -FilePath $msiexec -ArgumentList @('/x', $entry.UsbipdWinProductCode, '/qn', '/norestart') -Verb RunAs -WindowStyle Hidden -Wait -PassThru
    if ($child.ExitCode -notin @(0, 3010)) { throw "usbipd-win uninstall returned $($child.ExitCode)." }
    Remove-ItemProperty -Path $path -Name 'UsbipdWinProductCode' -ErrorAction SilentlyContinue
} catch {
    Add-Type -AssemblyName System.Windows.Forms
    [Windows.Forms.MessageBox]::Show($_.Exception.Message, 'RemoteUSB - usbipd-win uninstall') | Out-Null
    exit 1
}