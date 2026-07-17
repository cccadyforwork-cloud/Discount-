@echo off
setlocal

cd /d "%~dp0"
set "PORT=4173"
set "URL=http://localhost:%PORT%/index.html"

where py >nul 2>nul
if %errorlevel%==0 (
  start "" "%URL%"
  py -3 -m http.server %PORT%
  goto :eof
)

where python >nul 2>nul
if %errorlevel%==0 (
  start "" "%URL%"
  python -m http.server %PORT%
  goto :eof
)

where python3 >nul 2>nul
if %errorlevel%==0 (
  start "" "%URL%"
  python3 -m http.server %PORT%
  goto :eof
)

echo 未找到 Python，无法启动本地网页服务。
echo 请先安装 Python 3，然后重新双击 start.bat。
pause
