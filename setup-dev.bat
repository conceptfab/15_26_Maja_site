@echo off
chcp 65001 >nul
echo ========================================================
echo Maja Site - Konfiguracja Środowiska Deweloperskiego
echo ========================================================

echo.
echo [1/4] Sprawdzanie Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo BŁĄD: Node.js nie jest zainstalowany.
    echo Pobierz i zainstaluj ze strony: https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo [2/4] Instalacja zależnosci (npm install)...
call npm install

echo.
echo [3/4] Konfiguracja bazy danych (SQLite) i zmiennych środowiskowych...
if not exist .env (
    if exist .env.example (
        copy .env.example .env
        echo Skopiowano .env.example do .env
    ) else (
        echo Tworzenie domyślnego pliku .env...
        echo DATABASE_URL="file:./dev.db" > .env
    )
)

call npm run db:generate
call npm run db:push

echo.
echo [4/4] Uruchamianie serwera deweloperskiego...
echo.
echo Aplikacja za moment będzie dostępna pod adresem: http://localhost:3000
echo Naciśnij CTRL+C aby zatrzymać serwer.
echo.
call npm run dev
