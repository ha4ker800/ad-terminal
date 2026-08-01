@echo off
REM =============================================================================
REM AD TERMINAL - Windows CMD Worker Client
REM Connection script for Windows Command Prompt
REM Usage: curl -sSL https://your-app.vercel.app/connect.bat -o connect.bat && connect.bat <NODE_TOKEN>
REM =============================================================================

setlocal EnableDelayedExpansion

set "NODE_TOKEN=%~1"
set "SERVER_URL=%~2"
if "%~2"=="" set "SERVER_URL=wss://your-app.vercel.app/ws"

set "RECONNECT_DELAY=5"

cls
echo.
echo     _    ____  _____ ____  _____ ____  _       _    
echo    / \  ^|  _ \^|_   _^|  _ \^| ____^|  _ \^| ^|     / \   
echo   / _ \ ^| ^| ^| ^| ^| ^| ^| ^|_) ^|  _^| ^| ^|_) ^| ^|    / _ \  
echo  / ___ \^| ^|_^| ^| ^| ^| ^|  _ ^<^| ^|___^|  __/^| ^|___/ ___ \ 
echo /_/   \_\____/  ^|_^| ^|_^| \_\_____^|_^|   ^|_____/_/   \_\
echo.
echo [AD TERMINAL :: CONNECTOR] v1.0 - Autonomous C2 Platform
echo [AD TERMINAL :: CONNECTOR] Server: %SERVER_URL%
echo.

if "%~1"=="" (
    echo [AD TERMINAL :: ERROR] Node token required!
    echo Usage: connect.bat ^<NODE_TOKEN^>
    exit /b 1
)

echo [AD TERMINAL :: CONNECTOR] Node Token: %NODE_TOKEN%
echo [AD TERMINAL :: CONNECTOR] Initializing...

REM Create workspace directories
if not exist "%USERPROFILE%\ad_terminal_workspace" mkdir "%USERPROFILE%\ad_terminal_workspace"
if not exist "%USERPROFILE%\ad_terminal_workspace\projects" mkdir "%USERPROFILE%\ad_terminal_workspace\projects"
if not exist "%USERPROFILE%\ad_terminal_workspace\logs" mkdir "%USERPROFILE%\ad_terminal_workspace\logs"

REM Check for PowerShell (preferred)
where powershell >nul 2>&1
if %errorlevel%==0 (
    echo [AD TERMINAL :: CONNECTOR] PowerShell detected, delegating to PS script...
    powershell -Command "iwr -useb %SERVER_URL:/ws=/scripts/connect.ps1% ^| iex -args '%NODE_TOKEN%'"
    exit /b %errorlevel%
)

REM Fall back to curl-based HTTP polling
echo [AD TERMINAL :: CONNECTOR] Using HTTP polling mode...
echo [AD TERMINAL :: CONNECTOR] Ready. Connecting to C2...

:connect_loop
set "POLL_URL=%SERVER_URL:wss:=https:%"
set "POLL_URL=%POLL_URL:ws:=http:%"

echo [AD TERMINAL :: CONNECTOR] Polling for commands...

REM Get system info for telemetry
for /f "tokens=*" %%a in ('ver') do set "OS_VERSION=%%a"
for /f "tokens=2 delims==" %%a in ('wmic cpu get NumberOfLogicalProcessors /value ^| find "="') do set "CPU_CORES=%%a"
for /f "tokens=2 delims==" %%a in ('wmic computersystem get TotalPhysicalMemory /value ^| find "="') do set "TOTAL_RAM=%%a"
set /a "TOTAL_RAM_MB=%TOTAL_RAM:~0,-6% / 1048576"

REM Poll for commands
curl -s -X POST -H "Content-Type: application/json" -d "{\"nodeToken\":\"%NODE_TOKEN%\",\"osType\":\"windows\",\"osVersion\":\"%OS_VERSION%\",\"cpuCores\":%CPU_CORES%,\"totalRamMb\":%TOTAL_RAM_MB%}" "%POLL_URL%/poll" > "%TEMP%\ad_term_cmd.json" 2>nul

if exist "%TEMP%\ad_term_cmd.json" (
    REM Parse command from JSON (basic)
    for /f "tokens=*" %%a in ('type "%TEMP%\ad_term_cmd.json"') do set "RESPONSE=%%a"
    
    REM Check if response contains command
    echo !RESPONSE! | findstr "command" >nul
    if !errorlevel!==0 (
        echo [AD TERMINAL :: EXECUTE] Received command
        
        REM Extract command (simplified)
        for /f "delims=" %%i in ('echo !RESPONSE! ^| findstr "command"') do (
            set "CMD_LINE=%%i"
            set "CMD_LINE=!CMD_LINE:*\"command\":\"=!"
            set "CMD_LINE=!CMD_LINE:\"*=!"
        )
        
        REM Execute command
        cd /d "%USERPROFILE%\ad_terminal_workspace"
        
        set "START_TIME=%time%"
        cmd /c "!CMD_LINE!" > "%TEMP%\ad_term_stdout.txt" 2> "%TEMP%\ad_term_stderr.txt"
        set "EXIT_CODE=!errorlevel!"
        set "END_TIME=%time%"
        
        REM Read outputs
        set "STDOUT="
        set "STDERR="
        if exist "%TEMP%\ad_term_stdout.txt" (
            for /f "delims=" %%a in ('type "%TEMP%\ad_term_stdout.txt"') do set "STDOUT=!STDOUT!%%a\n"
        )
        if exist "%TEMP%\ad_term_stderr.txt" (
            for /f "delims=" %%a in ('type "%TEMP%\ad_term_stderr.txt"') do set "STDERR=!STDERR!%%a\n"
        )
        
        REM Send result back
        curl -s -X POST -H "Content-Type: application/json" -d "{\"nodeToken\":\"%NODE_TOKEN%\",\"stdout\":\"!STDOUT!\",\"stderr\":\"!STDERR!\",\"exitCode\":!EXIT_CODE!}" "%POLL_URL%/result" >nul 2>&1
        
        del "%TEMP%\ad_term_stdout.txt" 2>nul
        del "%TEMP%\ad_term_stderr.txt" 2>nul
    )
)

del "%TEMP%\ad_term_cmd.json" 2>nul

timeout /t %RECONNECT_DELAY% /nobreak >nul
goto connect_loop
