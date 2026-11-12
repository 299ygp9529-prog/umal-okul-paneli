# UMAL Print - okul bilgisayarindaki yazicilari DersMap ve tahtalara acar, gelen ciktilari yazdirir.
# Kurulum: panel > Print sekmesi. Dosyalar: C:\ProgramData\UMAL-Print (ayar.json, umal-print.ps1, SumatraPDF.exe, gunluk.txt)
$Surum = '1.0'
$ErrorActionPreference = 'Stop'
$Klasor = Join-Path $env:ProgramData 'UMAL-Print'
$Url = 'https://ceqdghykweubeaokwadt.supabase.co'
$Anahtar = 'sb_publishable_YCctPAToPYgrvfeieRumPw_4SNsfaEZ'
$TahtaAnahtar = 'umal-tahta-2026'
$Site = 'https://umalatlas.com.tr/print'
$ImzaAcik = '<RSAKeyValue><Modulus>wA8tOqte9uyUB8ANNT8ZeJxnyaWMIFqNJRaXin4sdCrqPhy4UlmlhmAwy79e2rV12RtHxmeUYMPOeaI6WB6JnuVceeYsg2i6IhI9ucHYeKObkMWNhmoHt8sTYzxf3+6okkl8CyUZEZoj0k+Z8Tqv2vfBqxr+PvquTYomKpZ05a1ZJpmjuPsZKrE9b0xZejO2ry8mw/15syQ0EqaXR/CTSw2l2pdEZ7Y4d/VIapBCC3ak/qpZhrnKgHoI7GewAF2R+7TlmmL2Foet1hgbd5nh9a9Y7XmoDyQq8CInRI5T3UuDEWrHlgl0lwEbGu59V/XmCkO5ypjNiJTgt1jhR6+u0Q==</Modulus><Exponent>AQAB</Exponent></RSAKeyValue>'

# Tek kopya calisir (baslangic gorevi + dakikalik bekci ayni betigi baslatir)
$yeni = $false
$kilit = New-Object System.Threading.Mutex($true, 'Global\UMAL-Print', [ref]$yeni)
if (-not $yeni) { exit 0 }

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

# Sanal "yazicilar" listelenmez (PDF/XPS/OneNote/Fax)
$Sanal = 'Microsoft Print to PDF|Microsoft XPS|OneNote|^Fax$|Send To OneNote|PDF24|Adobe PDF|CutePDF|Foxit.*PDF|doPDF|Bullzip|PDFCreator'
function Yazicilar {
  $liste = @()
  try {
    $portlar = @{}
    try { Get-WmiObject -Class Win32_TCPIPPrinterPort | ForEach-Object { $portlar[$_.Name] = $_.HostAddress } } catch {}
    Get-WmiObject -Class Win32_Printer | Where-Object { $_.Name -notmatch $Sanal } | Sort-Object Name | ForEach-Object {
      $ip = $null
      if ($portlar.ContainsKey($_.PortName)) { $ip = [string]$portlar[$_.PortName] }
      elseif ($_.PortName -match '(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})') { $ip = $Matches[1] }
      $liste += @{ ad = [string]$_.Name; port = [string]$_.PortName; ip = $ip; varsayilan = [bool]$_.Default }
    }
  } catch { Gunluk ('Yazici listesi: ' + $_.Exception.Message) }
  return $liste
}

function DurumGonder {
  $d = @{
    sinif = $Ad; surum = ('Print ' + $Surum); cihaz_turu = 'bilgisayar'
    kurulu_yazicilar = @(Yazicilar); yazdirma_hazir = [bool](Sumatra)
    acilis = $Acilis; simdi = [double][DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    bilgisayar = $env:COMPUTERNAME
  }
  if ($script:SonHata) { $d.hata = $script:SonHata }
  [void](Rpc 'umal_durum_yaz' @{ p_anahtar = $TahtaAnahtar; p_cihaz = $Cihaz; p_durum = $d })
  return ($d.kurulu_yazicilar | ForEach-Object { $_.ad }) -join '|'
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
    if (-not (Get-WmiObject -Class Win32_Printer | Where-Object { $_.Name -eq $yaz })) { throw ('Yazici bu bilgisayarda yok: ' + $yaz) }
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
    $kopya = 1; try { $kopya = [int]$is.kopya } catch {}
    if ($kopya -gt 1) { $ay += ($kopya.ToString() + 'x') }
    if ($is.cift_yuz) { $ay += 'duplexlong' } else { $ay += 'simplex' }
    $olcek = [string]$is.olcek; if (@('fit', 'shrink', 'noscale') -notcontains $olcek) { $olcek = 'fit' }
    $ay += $olcek
    $arg = '-print-to "' + $yaz + '" -print-settings "' + ($ay -join ',') + '" -silent -exit-when-done "' + $dosya + '"'
    $p = Start-Process -FilePath $sum -ArgumentList $arg -PassThru -WindowStyle Hidden
    if (-not $p.WaitForExit(300000)) { try { $p.Kill() } catch {}; throw 'Yazdirma 5 dakikada bitmedi' }
    if ($p.ExitCode -ne 0) { throw ('Yazdirma basarisiz (kod ' + $p.ExitCode + ')') }
    IsDurum $id 'yazdirildi' $null
    Gunluk ('Yazdirildi: ' + [string]$is.pdf_ad + ' > ' + $yaz + ' (' + ($ay -join ',') + ')')
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
    [IO.File]::WriteAllBytes($hedef + '.yeni', $veri)
    Copy-Item $hedef ($hedef + '.onceki') -Force
    Move-Item ($hedef + '.yeni') $hedef -Force
    Gunluk ("Guncellendi: $Surum > $yeniSurum")
    try { $kilit.ReleaseMutex() } catch {}
    exit 0
  } catch { Gunluk ('Guncelleme: ' + $_.Exception.Message) }
}

Gunluk ("UMAL Print $Surum basladi: $Ad ($Cihaz)")
Get-ChildItem $Klasor -Filter 'is-*.pdf' -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
$sonDurum = [DateTime]::MinValue; $sonGuncelle = [DateTime]::MinValue; $sonListe = ''; $sonTara = [DateTime]::MinValue; $ardHata = 0
while ($true) {
  try {
    $simdi = Get-Date
    # yazici listesi 10 sn'de bir bakilir; degistiyse hemen, degismediyse 30 sn'de bir bildirilir
    if (($simdi - $sonTara).TotalSeconds -ge 10) {
      $sonTara = $simdi
      $imdi = ((Yazicilar) | ForEach-Object { $_.ad }) -join '|'
      if ($imdi -ne $sonListe -or ($simdi - $sonDurum).TotalSeconds -ge 30) { $sonListe = DurumGonder; $sonDurum = $simdi; Biriktirici }
    }
    # isler 3 sn'de bir
    $yanit = Rpc 'umal_yazdirma_al' @{ p_anahtar = $TahtaAnahtar; p_cihaz = $Cihaz }
    $isler = @()
    if ($yanit) { $coz = $yanit | ConvertFrom-Json; foreach ($x in $coz) { if ($x) { $isler += $x } } }
    foreach ($is in $isler) { if ($is -and $is.id) { Yazdir $is } }
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
