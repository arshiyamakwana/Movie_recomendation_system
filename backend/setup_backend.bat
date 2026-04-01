@echo off
echo Setting up Mood Detection Backend...

:: Check if python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed. Please install Python 3.9 or higher.
    pause
    exit /b
)

:: Create virtual environment
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

:: Activate virtual environment and install requirements
echo Installing dependencies...
call venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt

echo.
echo Checking AI models...
echo This will automatically download required files.
echo Please wait until it says AI models ready.
echo.

:: Start the main server
python main.py

pause
