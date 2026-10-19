@echo off
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 goto try_python
py -3 scripts\local-server.py
goto end
:try_python
where python >nul 2>nul
if errorlevel 1 goto missing
python scripts\local-server.py
goto end
:missing
echo Python 3 wurde nicht gefunden. Bitte Python 3 installieren oder GitHub Pages nutzen.
:end
pause
