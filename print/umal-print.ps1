# UMAL Print - okul bilgisayarindaki yazicilari DersMap ve tahtalara acar, gelen ciktilari yazdirir.
# Kurulum: panel > Print sekmesi. Dosyalar: C:\ProgramData\UMAL-Print (ayar.json, umal-print.ps1, SumatraPDF.exe, gunluk.txt)
param([switch]$Kullanici, [switch]$Dene)
$Surum = '1.4'
$ErrorActionPreference = 'Stop'
$Klasor = Join-Path $env:ProgramData 'UMAL-Print'
$KulKlasor = Join-Path $Klasor 'kullanici'
# Sanal "yazicilar" listelenmez (PDF/XPS/OneNote/Fax)
$Sanal = 'Microsoft Print to PDF|Microsoft XPS|OneNote|^Fax$|PDF24|Adobe PDF|CutePDF|Foxit.*PDF|doPDF|Bullzip|PDFCreator'
# Yazicinin bildirdigi durum: hazir | kagit_az | kagit_yok | toner_az | toner_yok | kapak_acik | sikisma | cevrimdisi | servis | duraklatildi | hata
function YaziciSaglik($p) {
  try {
    $e = 0; try { $e = [int]$p.DetectedErrorState } catch {}
    switch ($e) { 3 { return 'kagit_az' } 4 { return 'kagit_yok' } 5 { return 'toner_az' } 6 { return 'toner_yok' } 7 { return 'kapak_acik' } 8 { return 'sikisma' } 9 { return 'cevrimdisi' } 10 { return 'servis' } 11 { return 'cikis_dolu' } }
    $s = 0; try { $s = [int]$p.PrinterStatus } catch {}
    if ($s -eq 7) { return 'cevrimdisi' }
    if ([bool]$p.WorkOffline) { return 'cevrimdisi' }
    return 'hazir'
  } catch { return 'bilinmiyor' }
}
function Yazicilar {
  $liste = @()
  try {
    $portlar = @{}
    try { Get-WmiObject -Class Win32_TCPIPPrinterPort | ForEach-Object { $portlar[$_.Name] = $_.HostAddress } } catch {}
    Get-WmiObject -Class Win32_Printer | Where-Object { $_.Name -notmatch $Sanal } | Sort-Object Name | ForEach-Object {
      $ip = $null
      if ($portlar.ContainsKey($_.PortName)) { $ip = [string]$portlar[$_.PortName] }
      elseif ($_.PortName -match '(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})') { $ip = $Matches[1] }
      $liste += @{ ad = [string]$_.Name; port = [string]$_.PortName; ip = $ip; varsayilan = [bool]$_.Default; saglik = (YaziciSaglik $_) }
    }
  } catch {}
  return $liste
}

# --- Kullanici modu: oturumu acik kullanicinin hesabinda calisir (gorev "UMAL Print Kullanici").
# Hizmet (SYSTEM) bir yaziciya kendi basina yazdiramazsa isi buraya birakir; ayrica yalniz kullaniciya gorunen yazicilar buradan bildirilir.
if ($Kullanici) {
  try {
    if (-not (Test-Path $KulKlasor)) { exit 0 }
    $ben = ($env:USERNAME -replace '[^0-9A-Za-z_-]', '')
    try { (@{ zaman = (Get-Date -Format 's'); yazicilar = @(Yazicilar) } | ConvertTo-Json -Depth 5) | Set-Content -Path (Join-Path $KulKlasor ('yazicilar-' + $ben + '.json')) -Encoding UTF8 } catch {}
    Get-ChildItem -Path $KulKlasor -Filter 'is-*.json' -ErrorAction SilentlyContinue | ForEach-Object {
      $kod = -1; $hata = ''
      try {
        $i = Get-Content $_.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
        $p = Start-Process -FilePath ([string]$i.sumatra) -ArgumentList ([string]$i.arg) -PassThru -WindowStyle Hidden
        $tut = $p.Handle
        if (-not $p.WaitForExit(240000)) { try { $p.Kill() } catch {}; $hata = 'zaman asimi' } else { $kod = $p.ExitCode }
        (@{ kod = $kod; hata = $hata; kim = $env:USERNAME } | ConvertTo-Json) | Set-Content -Path (Join-Path $KulKlasor ('sonuc-' + [string]$i.id + '.json')) -Encoding UTF8
      } catch {}
      try { Remove-Item $_.FullName -Force } catch {}
    }
  } catch {}
  exit 0
}
$Url = 'https://ceqdghykweubeaokwadt.supabase.co'
$Anahtar = 'sb_publishable_YCctPAToPYgrvfeieRumPw_4SNsfaEZ'
$TahtaAnahtar = 'umal-tahta-2026'
$Site = 'https://umalatlas.com.tr/print'
$ImzaAcik = '<RSAKeyValue><Modulus>wA8tOqte9uyUB8ANNT8ZeJxnyaWMIFqNJRaXin4sdCrqPhy4UlmlhmAwy79e2rV12RtHxmeUYMPOeaI6WB6JnuVceeYsg2i6IhI9ucHYeKObkMWNhmoHt8sTYzxf3+6okkl8CyUZEZoj0k+Z8Tqv2vfBqxr+PvquTYomKpZ05a1ZJpmjuPsZKrE9b0xZejO2ry8mw/15syQ0EqaXR/CTSw2l2pdEZ7Y4d/VIapBCC3ak/qpZhrnKgHoI7GewAF2R+7TlmmL2Foet1hgbd5nh9a9Y7XmoDyQq8CInRI5T3UuDEWrHlgl0lwEbGu59V/XmCkO5ypjNiJTgt1jhR6+u0Q==</Modulus><Exponent>AQAB</Exponent></RSAKeyValue>'

# Tek kopya calisir (baslangic gorevi + dakikalik bekci ayni betigi baslatir)
# -Dene: guncelleme oncesi deneme calistirmasi (tanimlar ve ayar yuklenir, sonra cikar; calisan kopyaya dokunmaz)
if (-not $Dene) {
  $yeni = $false
  $kilit = New-Object System.Threading.Mutex($true, 'Global\UMAL-Print', [ref]$yeni)
  if (-not $yeni) { exit 0 }
}

try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}
# Okul agi HTTPS'i kendi sertifikasiyla actigi icin sertifika denetimi kapali (guncelleme ayrica imzayla dogrulanir)
try { [Net.ServicePointManager]::ServerCertificateValidationCallback = { $true } } catch {}

function Gunluk([string]$m) {
  try {
    $d = Join-Path $Klasor 'gunluk.txt'
    if ((Test-Path $d) -and ((Get-Item $d).Length -gt 1MB)) { Move-Item $d ($d + '.eski') -Force }
    Add-Content -Path $d -Value ((Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + ' ' + $m) -Encoding UTF8
  } catch {}
}

function Istemci {
  $w = New-Object System.Net.WebClient
  $w.Encoding = [Text.Encoding]::UTF8
  $w.Headers['apikey'] = $Anahtar
  $w.Headers['Authorization'] = 'Bearer ' + $Anahtar
  $w.Headers['Content-Type'] = 'application/json'
  return $w
}
function Rpc([string]$ad, $govde) {
  $w = Istemci
  try { return $w.UploadString("$Url/rest/v1/rpc/$ad", 'POST', ($govde | ConvertTo-Json -Depth 8 -Compress)) }
  finally { $w.Dispose() }
}

$Ayar = Get-Content (Join-Path $Klasor 'ayar.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$Cihaz = [string]$Ayar.cihaz
$Ad = [string]$Ayar.ad
$Acilis = [double][DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$SonHata = $null; $HataBugun = 0; $HataGun = (Get-Date).Date

function HataYaz([string]$ozet) {
  if ((Get-Date).Date -ne $script:HataGun) { $script:HataGun = (Get-Date).Date; $script:HataBugun = 0 }
  $script:HataBugun++
  $script:SonHata = @{ zaman = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'); ozet = $ozet; bugun = $script:HataBugun }
  Gunluk ('HATA ' + $ozet)
}

function Sumatra {
  $y = Join-Path $Klasor 'SumatraPDF.exe'
  if (Test-Path $y) { return $y }
  return $null
}

function Biriktirici {
  try {
    $s = Get-Service -Name Spooler
    if ($s.Status -ne 'Running') { Set-Service -Name Spooler -StartupType Automatic; Start-Service -Name Spooler; Gunluk 'Yazdirma biriktiricisi baslatildi' }
  } catch { Gunluk ('Biriktirici: ' + $_.Exception.Message) }
}

# Kullanici oturumundan bildirilen yazicilar (son 3 gun) + SYSTEM'in gordukleri
function KullaniciYazicilari {
  $liste = @()
  try {
    Get-ChildItem -Path $KulKlasor -Filter 'yazicilar-*.json' -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-3) } | ForEach-Object {
      try { $j = Get-Content $_.FullName -Raw -Encoding UTF8 | ConvertFrom-Json; foreach ($y in $j.yazicilar) { if ($y -and $y.ad) { $liste += @{ ad = [string]$y.ad; port = [string]$y.port; ip = $y.ip; varsayilan = [bool]$y.varsayilan } } } } catch {}
    }
  } catch {}
  return $liste
}
function TumYazicilar {
  $hepsi = @(); $gor = @{}
  foreach ($y in @(Yazicilar)) { if (-not $gor.ContainsKey($y.ad)) { $gor[$y.ad] = 1; $hepsi += $y } }
  foreach ($y in @(KullaniciYazicilari)) { if (-not $gor.ContainsKey($y.ad)) { $gor[$y.ad] = 1; $hepsi += $y } }
  return $hepsi
}
# Kullanici gorevi: oturum acilinca ve gerektiginde calisir
function KullaniciGorevi {
  try {
    if (-not (Test-Path $KulKlasor)) { New-Item -ItemType Directory -Path $KulKlasor -Force | Out-Null }
    try { & icacls.exe $KulKlasor /grant '*S-1-5-32-545:(OI)(CI)M' 2>$null | Out-Null } catch {}
    $betik = Join-Path $Klasor 'umal-print.ps1'
    $eylem = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $betik + '" -Kullanici')
    $tet = New-ScheduledTaskTrigger -AtLogOn
    $kim = New-ScheduledTaskPrincipal -GroupId 'S-1-5-32-545' -RunLevel Limited
    $ay = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -MultipleInstances IgnoreNew
    Register-ScheduledTask -TaskName 'UMAL Print Kullanici' -Action $eylem -Trigger $tet -Principal $kim -Settings $ay -Force | Out-Null
    Start-ScheduledTask -TaskName 'UMAL Print Kullanici'
  } catch { Gunluk ('Kullanici gorevi: ' + $_.Exception.Message) }
}
function SumatraCalistir([string]$sum, [string]$arg) {
  $p = Start-Process -FilePath $sum -ArgumentList $arg -PassThru -WindowStyle Hidden
  $tut = $p.Handle
  if (-not $p.WaitForExit(300000)) { try { $p.Kill() } catch {}; return -2 }
  return [int]$p.ExitCode
}
# Isi oturumu acik kullanicinin hesabinda yazdirir; sonuc kodunu dondurur (-3: kullanici oturumu yanit vermedi)
function KullaniciYazdir([string]$id, [string]$sum, [string]$arg) {
  $son = Join-Path $KulKlasor ('sonuc-' + $id + '.json')
  try { if (Test-Path $son) { Remove-Item $son -Force } } catch {}
  (@{ id = $id; sumatra = $sum; arg = $arg } | ConvertTo-Json) | Set-Content -Path (Join-Path $KulKlasor ('is-' + $id + '.json')) -Encoding UTF8
  try { Start-ScheduledTask -TaskName 'UMAL Print Kullanici' } catch {}
  for ($i = 0; $i -lt 130; $i++) {
    Start-Sleep -Seconds 2
    if (Test-Path $son) {
      $kod = -1
      try { $kod = [int](Get-Content $son -Raw -Encoding UTF8 | ConvertFrom-Json).kod } catch {}
      try { Remove-Item $son -Force } catch {}
      return $kod
    }
    if ($i -eq 15) { try { Start-ScheduledTask -TaskName 'UMAL Print Kullanici' } catch {} }
  }
  try { Remove-Item (Join-Path $KulKlasor ('is-' + $id + '.json')) -Force } catch {}
  return -3
}

# Yazdirmadan once ve hata sonrasi: cevrimdisi isareti kaldirilir, duraklatilmis yazici devam ettirilir,
# ag yazicisinda yaniltici "cevrimdisi"ya yol acan SNMP denetimi kapatilir, kuyrukta hata verip takilan eski isler temizlenir.
function YaziciOnar([string]$ad) {
  $yapilan = @()
  try {
    $p = Get-WmiObject -Class Win32_Printer | Where-Object { $_.Name -eq $ad } | Select-Object -First 1
    if (-not $p) { return '' }
    try { if ([bool]$p.WorkOffline) { $p.WorkOffline = $false; [void]$p.Put(); $yapilan += 'cevrimdisi isareti kaldirildi' } } catch {}
    try { if ([int]$p.PrinterStatus -eq 7 -or [int]$p.ExtendedPrinterStatus -eq 8) { [void]$p.Resume(); $yapilan += 'devam ettirildi' } } catch {}
    try {
      $port = Get-WmiObject -Class Win32_TCPIPPrinterPort | Where-Object { $_.Name -eq $p.PortName } | Select-Object -First 1
      if ($port -and [bool]$port.SNMPEnabled) { $port.SNMPEnabled = $false; [void]$port.Put(); $yapilan += 'SNMP kapatildi' }
    } catch {}
    try {
      $esik = (Get-Date).AddMinutes(-10)
      Get-WmiObject -Class Win32_PrintJob | Where-Object { ([string]$_.Name).StartsWith($ad + ',') } | ForEach-Object {
        $j = $_; $zaman = $null
        try { $zaman = [Management.ManagementDateTimeConverter]::ToDateTime([string]$j.TimeSubmitted) } catch {}
        $hatali = ([string]$j.Status) -match 'Error|Hata' -or ([string]$j.JobStatus) -match 'Error|Hata|Deleting|Siliniyor'
        if ($hatali -and $zaman -and $zaman -lt $esik) { try { [void]$j.Delete(); $yapilan += ('takilan is silindi: ' + [string]$j.Document) } catch {} }
      }
    } catch {}
  } catch {}
  if ($yapilan.Count -gt 0) { Gunluk ('Yazici onarildi (' + $ad + '): ' + ($yapilan -join ', ')) }
  return ($yapilan -join ', ')
}
# Kuyruktaki isimiz: yok (bitti) | bekliyor | hata nedeni
function KuyrukDurumu([string]$ad, [string]$id) {
  try {
    $j = Get-WmiObject -Class Win32_PrintJob | Where-Object { ([string]$_.Name).StartsWith($ad + ',') -and ([string]$_.Document) -like ('*' + $id + '*') } | Select-Object -First 1
    if (-not $j) { return 'yok' }
    $p = Get-WmiObject -Class Win32_Printer | Where-Object { $_.Name -eq $ad } | Select-Object -First 1
    $s = 'hazir'; if ($p) { $s = YaziciSaglik $p }
    if ($s -ne 'hazir' -and $s -ne 'bilinmiyor') { return $s }
    if (([string]$j.Status) -match 'Error|Hata' -or ([string]$j.JobStatus) -match 'Error|Hata|Offline|Paper') { return 'hata' }
    return 'bekliyor'
  } catch { return 'yok' }
}
$Izle = @{}
$SaglikAd = @{ kagit_az = 'kagit azaldi'; kagit_yok = 'kagit yok'; toner_az = 'toner azaldi'; toner_yok = 'toner bitti'; kapak_acik = 'kapak acik'; sikisma = 'kagit sikisti'; cevrimdisi = 'yazici kapali ya da agda yok'; servis = 'servis gerekiyor'; cikis_dolu = 'cikis tepsisi dolu'; hata = 'yazici hata veriyor'; bekliyor = 'sirasini bekliyor' }
function IzleKontrol {
  foreach ($k in @($script:Izle.Keys)) {
    try {
      $x = $script:Izle[$k]
      $dur = KuyrukDurumu ([string]$x.yazici) $k
      if ($dur -eq 'yok') { IsDurum $k 'yazdirildi' $null; $script:Izle.Remove($k); Gunluk ('Yazicidan cikti: ' + $k); continue }
      if (((Get-Date) - [DateTime]$x.zaman).TotalHours -ge 3) { $script:Izle.Remove($k); continue }
      if ($dur -ne [string]$x.son) { $x.son = $dur; $n = [string]$script:SaglikAd[$dur]; if (-not $n) { $n = $dur }; IsDurum $k 'yazicida' ('Yazicida bekliyor: ' + $n) }
      if ($dur -eq 'cevrimdisi' -or $dur -eq 'hata') { [void](YaziciOnar ([string]$x.yazici)) }
    } catch {}
  }
}

function DurumGonder {
  $d = @{
    sinif = $Ad; surum = ('Print ' + $Surum); cihaz_turu = 'bilgisayar'
    kurulu_yazicilar = @(TumYazicilar); yazdirma_hazir = [bool](Sumatra)
    acilis = $Acilis; simdi = [double][DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    bilgisayar = $env:COMPUTERNAME
  }
  if ($script:SonHata) { $d.hata = $script:SonHata }
  [void](Rpc 'umal_durum_yaz' @{ p_anahtar = $TahtaAnahtar; p_cihaz = $Cihaz; p_durum = $d })
  return ($d.kurulu_yazicilar | ForEach-Object { [string]$_.ad + ':' + [string]$_.saglik }) -join '|'
}

function IsDurum([string]$id, [string]$durum, [string]$hata) {
  for ($i = 0; $i -lt 5; $i++) {
    try { [void](Rpc 'umal_yazdirma_durum' @{ p_anahtar = $TahtaAnahtar; p_cihaz = $Cihaz; p_id = $id; p_durum = $durum; p_hata = $hata }); return } catch { Start-Sleep -Seconds 2 }
  }
}

function Yazdir($is) {
  $id = [string]$is.id
  IsDurum $id 'yazdiriliyor' $null
  $dosya = Join-Path $Klasor ('is-' + $id + '.pdf')
  try {
    $sum = Sumatra
    if (-not $sum) { throw 'SumatraPDF bulunamadi (kurulumu yeniden calistirin)' }
    Biriktirici
    $yaz = [string]$is.yazici
    $bende = [bool](Get-WmiObject -Class Win32_Printer | Where-Object { $_.Name -eq $yaz })
    if (-not $bende -and -not (@(KullaniciYazicilari) | Where-Object { $_.ad -eq $yaz })) { throw ('Yazici bu bilgisayarda yok: ' + $yaz) }
    # indir (5 deneme) ve dogrula
    $tamam = $false; $son = ''
    for ($i = 0; $i -lt 5 -and -not $tamam; $i++) {
      try {
        $w = New-Object System.Net.WebClient
        try { $w.DownloadFile(("$Url/storage/v1/object/public/umal-pdf/" + [string]$is.pdf_yol), $dosya) } finally { $w.Dispose() }
        $ozet = (Get-FileHash -Path $dosya -Algorithm SHA256).Hash.ToLower()
        if ($is.sha256 -and ($ozet -ne ([string]$is.sha256).ToLower())) { throw 'Dosya bozuk indi' }
        $tamam = $true
      } catch { $son = $_.Exception.Message; Start-Sleep -Seconds 2 }
    }
    if (-not $tamam) { throw ('PDF indirilemedi: ' + $son) }
    $ay = @()
    if ($is.sayfalar) { $ay += [string]$is.sayfalar }
    $tc = [string]$is.tek_cift; if ($tc -eq 'tek') { $ay += 'odd' } elseif ($tc -eq 'cift') { $ay += 'even' }
    $kopya = 1; try { $kopya = [int]$is.kopya } catch {}
    if ($kopya -gt 1) { $ay += ($kopya.ToString() + 'x') }
    if ($is.cift_yuz) { if ([string]$is.kenar -eq 'kisa') { $ay += 'duplexshort' } else { $ay += 'duplexlong' } } else { $ay += 'simplex' }
    $olcek = [string]$is.olcek; if (@('fit', 'shrink', 'noscale') -notcontains $olcek) { $olcek = 'fit' }
    $ay += $olcek
    if ([string]$is.renk -eq 'siyah') { $ay += 'monochrome' } elseif ([string]$is.renk -eq 'renkli') { $ay += 'color' }
    $yon = [string]$is.yon; if ($yon -eq 'dikey') { $ay += 'portrait' } elseif ($yon -eq 'yatay') { $ay += 'landscape' }
    $kg = [string]$is.kagit; if (@('A3', 'A5') -contains $kg) { $ay += ('paper=' + $kg) }
    $arg = '-print-to "' + $yaz + '" -print-settings "' + ($ay -join ',') + '" -silent -exit-when-done "' + $dosya + '"'
    [void](YaziciOnar $yaz)
    # 1) hizmet kendi yazdirir  2) olmazsa oturumu acik kullanicinin hesabinda  3) o da olmazsa yazicinin kendi ayarlariyla
    $kod1 = -9; $kod2 = -9; $kod3 = -9; $yol = ''
    $arg3 = '-print-to "' + $yaz + '" -silent -exit-when-done "' + $dosya + '"'
    if ($bende) { $kod1 = SumatraCalistir $sum $arg; if ($kod1 -eq 0) { $yol = 'hizmet' } }
    if (-not $yol) { $kod2 = KullaniciYazdir $id $sum $arg; if ($kod2 -eq 0) { $yol = 'kullanici' } }
    if (-not $yol -and $kod2 -ne -3) {
      $kod3 = KullaniciYazdir $id $sum $arg3; if ($kod3 -eq 0) { $yol = 'kullanici-sade' }
    }
    if (-not $yol -and $bende) { $kod3 = SumatraCalistir $sum $arg3; if ($kod3 -eq 0) { $yol = 'hizmet-sade' } }
    # Olmadiysa vazgecilmez: yazici onarilir, biriktirici yeniden baslatilir, iki kez daha denenir
    for ($d = 2; $d -le 3 -and -not $yol; $d++) {
      IsDurum $id 'yazdiriliyor' ('Yeniden deneniyor (' + $d + '/3)')
      Gunluk ('Yeniden deneniyor (' + $d + '/3): ' + $yaz)
      [void](YaziciOnar $yaz)
      if ($d -eq 2) { try { Restart-Service -Name Spooler -Force; Start-Sleep -Seconds 8 } catch {} } else { Start-Sleep -Seconds 40 }
      Biriktirici
      $bende = [bool](Get-WmiObject -Class Win32_Printer | Where-Object { $_.Name -eq $yaz })
      if ($bende) { $kod1 = SumatraCalistir $sum $arg; if ($kod1 -eq 0) { $yol = 'hizmet-' + $d } }
      if (-not $yol -and $bende) { $kod3 = SumatraCalistir $sum $arg3; if ($kod3 -eq 0) { $yol = 'hizmet-sade-' + $d } }
      if (-not $yol) { $kod2 = KullaniciYazdir $id $sum $arg3; if ($kod2 -eq 0) { $yol = 'kullanici-sade-' + $d } }
    }
    if (-not $yol) {
      $ek = ''; if ($kod2 -eq -3) { $ek = '; bilgisayarda oturumu acik kullanici yok ya da yanit vermedi' }
      throw ('Yazici yazdirmayi kabul etmedi (hizmet ' + $kod1 + ', kullanici ' + $kod2 + ', sade ' + $kod3 + ')' + $ek)
    }
    Gunluk ('Yaziciya gonderildi [' + $yol + ']: ' + [string]$is.pdf_ad + ' > ' + $yaz + ' (' + ($ay -join ',') + ')')
    # Kuyruk dogrulamasi: is yazicidan cikana kadar izlenir; takilirsa nedeni panele bildirilir
    $dur = 'yok'
    for ($k = 0; $k -lt 6; $k++) { Start-Sleep -Seconds 3; $dur = KuyrukDurumu $yaz $id; if ($dur -eq 'yok') { break } }
    if ($dur -eq 'yok') { IsDurum $id 'yazdirildi' $null }
    else {
      $n = [string]$script:SaglikAd[$dur]; if (-not $n) { $n = $dur }
      IsDurum $id 'yazicida' ('Yazicida bekliyor: ' + $n)
      $script:Izle[$id] = @{ yazici = $yaz; zaman = (Get-Date); son = $dur }
    }
  } catch {
    $m = $_.Exception.Message
    IsDurum $id 'hata' $m
    HataYaz ('Yazdirma: ' + $m)
  } finally {
    try { if (Test-Path $dosya) { Remove-Item $dosya -Force } } catch {}
  }
}

# Imzali guncelleme: yeni surum varsa indirir, imzayi dogrular, dosyayi degistirir ve cikar (bekci gorevi yeniden baslatir)
function Guncelle {
  try {
    $w = New-Object System.Net.WebClient; $w.Encoding = [Text.Encoding]::UTF8
    try {
      $yeniSurum = ($w.DownloadString("$Site/surum.txt?z=" + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds())).Trim()
      if (-not $yeniSurum -or ([version]$yeniSurum -le [version]$Surum)) { return }
      $veri = $w.DownloadData("$Site/umal-print.ps1?v=$yeniSurum")
      $imza = [Convert]::FromBase64String(($w.DownloadString("$Site/umal-print.ps1.imza?v=$yeniSurum")).Trim())
    } finally { $w.Dispose() }
    $rsa = New-Object System.Security.Cryptography.RSACryptoServiceProvider
    $rsa.FromXmlString($ImzaAcik)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $ok = $rsa.VerifyHash($sha.ComputeHash($veri), [System.Security.Cryptography.CryptoConfig]::MapNameToOID('SHA256'), $imza)
    if (-not $ok) { Gunluk 'Guncelleme imzasi gecersiz; uygulanmadi'; return }
    $hedef = Join-Path $Klasor 'umal-print.ps1'
    $deneme = Join-Path $Klasor 'umal-print-yeni.ps1'
    [IO.File]::WriteAllBytes($deneme, $veri)
    # Guvenlik: yeni surum once dil denetiminden, sonra deneme calistirmasindan gecer; gecemezse uygulanmaz
    $hatalar = $null; $jetonlar = $null
    [void][System.Management.Automation.Language.Parser]::ParseFile($deneme, [ref]$jetonlar, [ref]$hatalar)
    if ($hatalar -and $hatalar.Count -gt 0) { Gunluk ('Guncelleme ' + $yeniSurum + ' dil denetiminden gecemedi; uygulanmadi: ' + $hatalar[0].Message); try { Remove-Item $deneme -Force } catch {}; return }
    $dp = Start-Process -FilePath 'powershell.exe' -ArgumentList ('-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $deneme + '" -Dene') -PassThru -WindowStyle Hidden
    $tut2 = $dp.Handle
    if (-not $dp.WaitForExit(60000)) { try { $dp.Kill() } catch {}; Gunluk ('Guncelleme ' + $yeniSurum + ' deneme calistirmasi bitmedi; uygulanmadi'); try { Remove-Item $deneme -Force } catch {}; return }
    if ($dp.ExitCode -ne 0) { Gunluk ('Guncelleme ' + $yeniSurum + ' deneme calistirmasi hata verdi (' + $dp.ExitCode + '); uygulanmadi'); try { Remove-Item $deneme -Force } catch {}; return }
    Copy-Item $hedef ($hedef + '.onceki') -Force
    Move-Item $deneme $hedef -Force
    Gunluk ("Guncellendi: $Surum > $yeniSurum")
    try { $kilit.ReleaseMutex() } catch {}
    exit 0
  } catch { Gunluk ('Guncelleme: ' + $_.Exception.Message) }
}

if ($Dene) { exit 0 }
Gunluk ("UMAL Print $Surum basladi: $Ad ($Cihaz)")
Get-ChildItem $Klasor -Filter 'is-*.pdf' -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
KullaniciGorevi
$sonDurum = [DateTime]::MinValue; $sonGuncelle = [DateTime]::MinValue; $sonListe = ''; $sonTara = [DateTime]::MinValue; $ardHata = 0; $sonIzle = [DateTime]::MinValue
while ($true) {
  try {
    $simdi = Get-Date
    # yazici listesi 10 sn'de bir bakilir; degistiyse hemen, degismediyse 30 sn'de bir bildirilir
    if (($simdi - $sonTara).TotalSeconds -ge 10) {
      $sonTara = $simdi
      $imdi = (@(TumYazicilar) | ForEach-Object { [string]$_.ad + ':' + [string]$_.saglik }) -join '|'
      if ($imdi -ne $sonListe -or ($simdi - $sonDurum).TotalSeconds -ge 30) { $sonListe = DurumGonder; $sonDurum = $simdi; Biriktirici }
    }
    # isler 3 sn'de bir
    $yanit = Rpc 'umal_yazdirma_al' @{ p_anahtar = $TahtaAnahtar; p_cihaz = $Cihaz }
    $isler = @()
    if ($yanit) { $coz = $yanit | ConvertFrom-Json; foreach ($x in $coz) { if ($x) { $isler += $x } } }
    foreach ($is in $isler) { if ($is -and $is.id) { Yazdir $is } }
    if ($Izle.Count -gt 0 -and ($simdi - $sonIzle).TotalSeconds -ge 10) { $sonIzle = $simdi; IzleKontrol }
    if ($isler.Count -gt 0) { $sonListe = DurumGonder; $sonDurum = Get-Date }
    if (($simdi - $sonGuncelle).TotalMinutes -ge 20) { $sonGuncelle = $simdi; Guncelle }
    $ardHata = 0
    Start-Sleep -Seconds 3
  } catch {
    $ardHata++
    if ($ardHata -eq 1 -or ($ardHata % 20) -eq 0) { Gunluk ('Baglanti: ' + $_.Exception.Message) }
    Start-Sleep -Seconds ([Math]::Min(3 + $ardHata, 15))
  }
}
