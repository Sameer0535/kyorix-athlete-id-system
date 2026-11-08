$WshShell = New-Object -comObject WScript.Shell
$Desktop = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $Desktop "Kyorix Athlete ID System.lnk"
$CurrentDir = (Get-Item -Path "." -Verbose).FullName
$IconPath = Join-Path $CurrentDir "public\app-icon.ico"

# Create Desktop Shortcut
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)

# Point to msedge --app to launch as native desktop window with no browser address bar
$EdgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $EdgePath)) {
    $EdgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

if (Test-Path $EdgePath) {
    $Shortcut.TargetPath = $EdgePath
    $Shortcut.Arguments = "--app=https://kyorix-idcard.vercel.app/admin --window-size=1366,850"
} else {
    # Fallback to direct URL or default browser
    $Shortcut.TargetPath = "https://kyorix-idcard.vercel.app/admin"
}

$Shortcut.WorkingDirectory = $CurrentDir
$Shortcut.IconLocation = "$IconPath, 0"
$Shortcut.Description = "Kyorix Athlete ID System - Accreditation Console"
$Shortcut.Save()

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Desktop Shortcut Created Successfully!" -ForegroundColor Green
Write-Host " Shortcut Location: $ShortcutPath" -ForegroundColor Yellow
Write-Host " Icon: $IconPath" -ForegroundColor Yellow
Write-Host " Launches Directly into: https://kyorix-idcard.vercel.app/admin" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
