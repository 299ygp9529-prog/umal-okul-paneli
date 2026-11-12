# UMAL Print kurulumu (yonetici olarak calisir). Panel > Print sekmesindeki dosya ya da komut bunu indirip calistirir.
$ErrorActionPreference = 'Stop'
$Site = 'https://umalatlas.com.tr/print'
$Klasor = Join-Path $env:ProgramData 'UMAL-Print'
$Gorev = 'UMAL Print'; $Bekci = 'UMAL Print Bekci'
function Yaz([string]$m, [string]$renk = 'Gray') { Write-Host $m -ForegroundColor $renk }
try {
  Yaz ''; Yaz '  UMAL Print kurulumu' 'Cyan'; Yaz '  -------------------' 'Cyan'
  $yon = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $yon) { throw 'Bu kurulum yonetici olarak calistirilmali (dosyaya sag tiklayip "Yonetici olarak calistir").' }
  if ($PSVersionTable.PSVersion.Major -lt 5) { throw 'Bu bilgisayarda PowerShell 5 yok (Windows 10 ya da 11 gerekir).' }
  try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}
  try { [Net.ServicePointManager]::ServerCertificateValidationCallback = { $true } } catch {}
  New-Item -ItemType Directory -Path $Klasor -Force | Out-Null

  # 1) Calisan kopyayi durdur
  foreach ($g in @($Gorev, $Bekci)) { try { Stop-ScheduledTask -TaskName $g -ErrorAction SilentlyContinue } catch {} }
  Get-WmiObject Win32_Process -Filter "Name='powershell.exe'" | Where-Object { $_.CommandLine -match 'umal-print\.ps1' } | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force } catch {} }

  # 2) Ad ve kimlik (onceki kurulum varsa ayni kalir)
  $ayarYol = Join-Path $Klasor 'ayar.json'
  $eskiAd = ''; $cihaz = ''
  if (Test-Path $ayarYol) { try { $e = Get-Content $ayarYol -Raw -Encoding UTF8 | ConvertFrom-Json; $eskiAd = [string]$e.ad; $cihaz = [string]$e.cihaz } catch {} }
  if (-not $eskiAd) { $eskiAd = $env:COMPUTERNAME }
  Yaz ''
  Yaz '  Bu bilgisayar panelde hangi adla gorunsun? (ornek: Kutuphane, Mudur Yardimcisi Odasi)'
  $ad = Read-Host ("  Ad [" + $eskiAd + "]")
  if (-not $ad -or -not $ad.Trim()) { $ad = $eskiAd }
  $ad = $ad.Trim()
  if (-not $cihaz -or $cihaz -notmatch '^[0-9A-Za-z_-]{1,64}$') {
    $h = ($env:COMPUTERNAME -replace '[^0-9A-Za-z_-]', '')
    if (-not $h) { $h = [guid]::NewGuid().ToString('N').Substring(0, 12) }
    $cihaz = ('print-' + $h); if ($cihaz.Length -gt 64) { $cihaz = $cihaz.Substring(0, 64) }
  }
  (@{ cihaz = $cihaz; ad = $ad } | ConvertTo-Json) | Set-Content -Path $ayarYol -Encoding UTF8

  # 3) Program
  Yaz '  Program indiriliyor...'
  $w = New-Object System.Net.WebClient
  $z = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  $w.DownloadFile("$Site/umal-print.ps1?z=$z", (Join-Path $Klasor 'umal-print.ps1'))

  # 4) SumatraPDF (sessiz PDF yazdirma): once bu bilgisayarda aranir, yoksa resmi sitesinden indirilir
  $sum = Join-Path $Klasor 'SumatraPDF.exe'
  if (-not (Test-Path $sum)) {
    $aday = @()
    foreach ($k in @($env:ProgramData, $env:ProgramFiles, ${env:ProgramFiles(x86)}, $env:LOCALAPPDATA, 'C:\')) {
      if ($k -and (Test-Path $k)) {
        Get-ChildItem -Path $k -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'UMAL|Sumatra' } | ForEach-Object {
          $aday += @(Get-ChildItem -Path $_.FullName -Filter 'SumatraPDF*.exe' -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Name -notmatch 'install' })
        }
      }
    }
    if ($aday.Count -gt 0) { Copy-Item $aday[0].FullName $sum -Force; Yaz ('  SumatraPDF bu bilgisayarda bulundu: ' + $aday[0].FullName) }
  }
  if (-not (Test-Path $sum)) {
    Yaz '  SumatraPDF indiriliyor (yaklasik 10 MB)...'
    $bit = '64'; if (-not [Environment]::Is64BitOperatingSystem) { $bit = '32' }
    $zip = Join-Path $Klasor 'sumatra.zip'; $cik = Join-Path $Klasor 'sumatra-gecici'
    $w.DownloadFile("https://www.sumatrapdfreader.org/dl/rel/3.6.1/SumatraPDF-3.6.1-$bit.zip", $zip)
    if (Test-Path $cik) { Remove-Item $cik -Recurse -Force }
    Expand-Archive -Path $zip -DestinationPath $cik -Force
    $exe = Get-ChildItem -Path $cik -Filter 'SumatraPDF*.exe' -Recurse | Select-Object -First 1
    if (-not $exe) { throw 'SumatraPDF arsivinden program cikmadi.' }
    Copy-Item $exe.FullName $sum -Force
    Remove-Item $zip -Force; Remove-Item $cik -Recurse -Force
  }
  try { Unblock-File -Path $sum } catch {}
  $w.Dispose()

  # 5) Eski UMAL Ajan durdurulur ve devre disi birakilir (silinmez; UMAL-Print-Kaldir geri acar)
  try {
    Get-ScheduledTask | Where-Object { $_.TaskName -match 'Ajan' -and ($_.TaskName + $_.TaskPath) -match 'UMAL' } | ForEach-Object {
      try { Stop-ScheduledTask -TaskName $_.TaskName -TaskPath $_.TaskPath } catch {}
      try { Disable-ScheduledTask -TaskName $_.TaskName -TaskPath $_.TaskPath | Out-Null } catch {}
      Yaz ('  Eski gorev devre disi: ' + $_.TaskName) 'Yellow'
    }
  } catch {}
  Get-WmiObject Win32_Process -Filter "Name='powershell.exe'" | Where-Object { $_.CommandLine -match 'Ajan' -and $_.ProcessId -ne $PID } | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force } catch {} }

  # 6) Gorev: acilista baslar; ayrica her dakika tetiklenir (calisiyorsa yok sayilir, durduysa yeniden baslar)
  $betik = Join-Path $Klasor 'umal-print.ps1'
  try { Unregister-ScheduledTask -TaskName $Bekci -Confirm:$false -ErrorAction SilentlyContinue } catch {}
  $eylem = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $betik + '"')
  $t1 = New-ScheduledTaskTrigger -AtStartup
  $t2 = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1) -RepetitionDuration (New-TimeSpan -Days 3650)
  $kim = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
  $ay = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
  Register-ScheduledTask -TaskName $Gorev -Action $eylem -Trigger @($t1, $t2) -Principal $kim -Settings $ay -Force | Out-Null
  try { Set-Service -Name Spooler -StartupType Automatic; Start-Service -Name Spooler } catch {}
  Start-ScheduledTask -TaskName $Gorev

  # 7) Sonuc
  Yaz '  Baslatildi, ilk bildirim bekleniyor...'
  Start-Sleep -Seconds 12
  $yz = @(Get-WmiObject -Class Win32_Printer | ForEach-Object { $_.Name })
  Yaz ''
  Yaz ('  KURULDU: ' + $ad + '  (kimlik: ' + $cihaz + ')') 'Green'
  Yaz ('  Bu bilgisayardaki yazicilar (' + $yz.Count + '):')
  foreach ($y in $yz) { Yaz ('    - ' + $y) }
  $g = Join-Path $Klasor 'gunluk.txt'
  if (Test-Path $g) { Yaz ''; Yaz '  Son kayitlar:'; Get-Content $g -Tail 4 -Encoding UTF8 | ForEach-Object { Yaz ('    ' + $_) } }
  else { Yaz '  UYARI: program henuz kayit yazmadi; 1 dakika sonra panelden kontrol edin.' 'Yellow' }
  Yaz ''; Yaz '  1-2 dakika icinde panelde ve DersMap te Bilgisayarlar / Yazicilar altinda gorunur.' 'Cyan'
} catch {
  Yaz ''; Yaz ('  KURULAMADI: ' + $_.Exception.Message) 'Red'
}
