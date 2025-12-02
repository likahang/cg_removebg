@echo off
chcp 65001 >nul
echo ====================================
echo 啟動 RemoveBG 本機服務
echo ====================================
echo.

echo [1/2] 啟動後端 API (FastAPI)...
start "RemoveBG 後端" cmd /k "cd /d %~dp0 && python -m uvicorn server:app --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

echo [2/2] 啟動前端網頁 (Vite)...
start "RemoveBG 前端" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 2 /nobreak >nul

echo.
echo ====================================
echo ✓ 服務啟動完成！
echo ====================================
echo.
echo 本機存取:
echo   前端網頁: http://localhost:5173
echo   後端 API: http://localhost:8000
echo.
echo 區域網路存取 (其他電腦):
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do echo   前端網頁: http://%%b:5173
)
echo.
echo 請勿關閉兩個命令視窗，關閉即停止服務
echo 確保防火牆允許端口 5173 和 8000
echo ====================================
echo.

timeout /t 5
start http://localhost:5173

exit
