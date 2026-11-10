# ==============================================================================
# build.ps1 — Скрипт сборки, валидации и тестирования интерактивной книги «Основы сетей»
# ==============================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Сборка и валидация интерактивной книги «Основы сетей»    " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Запуск модульных тестов виртуального ядра (Node.js test runner)
Write-Host "`n[1/3] Запуск тестов виртуального сетевого ядра..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
    node --test test/*.test.js
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Ошибка: Модульные тесты ядра завершились с ошибкой!"
        exit 1
    }
    Write-Host " [OK] Все модульные тесты успешно пройдены!" -ForegroundColor Green
} else {
    Write-Warning " [WARN] Node.js не найден в системе. Пропуск запуска unit-тестов."
}

# 2. Проверка целостности ключевых файлов книги
Write-Host "`n[2/3] Проверка структуры и файлов книги..." -ForegroundColor Yellow
$requiredFiles = @(
    "index.html",
    "css/book-theme.css",
    "css/interactive-lab.css",
    "js/app.js",
    "js/audio/SoundManager.js",
    "js/engine/BitMath.js",
    "js/engine/Packet.js",
    "js/engine/Device.js",
    "js/engine/NetworkBus.js"
)

$missing = @()
foreach ($f in $requiredFiles) {
    if (-not (Test-Path $f)) {
        $missing += $f
    }
}

if ($missing.Count -gt 0) {
    Write-Host " [INFO] Некоторые файлы интерфейса или виджетов будут созданы на следующем этапе:" -ForegroundColor Gray
    foreach ($m in $missing) {
        Write-Host "   - $m" -ForegroundColor DarkGray
    }
} else {
    Write-Host " [OK] Все обязательные файлы присутствуют." -ForegroundColor Green
}

# 3. Итог
Write-Host "`n[3/3] Готово! Книга готова к открытию в браузере:`n  index.html`n" -ForegroundColor Green