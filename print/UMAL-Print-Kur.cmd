@echo off
title UMAL Print Kurulum
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Yonetici izni isteniyor...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "try{[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12}catch{};[Net.ServicePointManager]::ServerCertificateValidationCallback={$true};$w=New-Object Net.WebClient;$w.Encoding=[Text.Encoding]::UTF8;iex $w.DownloadString('https://umalatlas.com.tr/print/kur.ps1?z='+[DateTime]::UtcNow.Ticks)"
echo.
pause
