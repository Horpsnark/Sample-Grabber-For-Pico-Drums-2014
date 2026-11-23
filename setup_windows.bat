@echo off
setlocal
cd /d "%~dp0"

where py >nul 2>nul
if %errorlevel%==0 (
    set "PY_CMD=py -3"
) else (
    where python >nul 2>nul
    if %errorlevel%==0 (
        set "PY_CMD=python"
    ) else (
        echo Python 3.9+ was not found on PATH.
        echo Download Python 3 from https://www.python.org/downloads/ and check "Add python.exe to PATH".
        pause
        exit /b 1
    )
)

echo Using: %PY_CMD%
%PY_CMD% check_python.py --install
if %errorlevel% neq 0 (
    echo.
    echo Setup failed. Review the messages above.
    pause
    exit /b 1
)

echo.
echo All GRAB64 Python dependencies are installed.
echo You can now launch GRAB64 with: %PY_CMD% grab64_dark.py
pause
