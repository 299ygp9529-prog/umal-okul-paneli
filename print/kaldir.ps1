# UMAL Print'i kaldirir; devre disi birakilmis eski UMAL Ajan gorevlerini yeniden etkinlestirir.
$Klasor = Join-Path $env:ProgramData 'UMAL-Print'
foreach ($g in @('UMAL Print', 'UMAL Print Bekci')) { try { Stop-ScheduledTask -TaskName $g -ErrorAction SilentlyContinue } catch {}; try { Unregister-ScheduledTask -TaskName $g -Confirm:$false -ErrorAction SilentlyContinue } catch {} }
Get-WmiObject Win32_Process -Filter "Name='powershell.exe'" | Where-Object { $_.CommandLine -match 'umal-print\.ps1' } | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force } catch {} }
try {
  Get-ScheduledTask | Where-Object { $_.TaskName -match 'Ajan' -and ($_.TaskName + $_.TaskPath) -match 'UMAL' } | ForEach-Object {
    try { Enable-ScheduledTask -TaskName $_.TaskName -TaskPath $_.TaskPath | Out-Null; Start-ScheduledTask -TaskName $_.TaskName -TaskPath $_.TaskPath } catch {}
    Write-Host ('  Eski gorev yeniden etkin: ' + $_.TaskName)
  }
} catch {}
Start-Sleep -Seconds 2
try { Remove-Item $Klasor -Recurse -Force } catch {}
Write-Host '  UMAL Print kaldirildi.' -ForegroundColor Green
