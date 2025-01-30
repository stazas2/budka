@echo off
REM Проверяем наличие файла pathExe.txt
if exist "Server\pathExe.txt" (
    start /B "" "Server/Api.exe"
    timeout /t 2 /nobreak > nul
    echo Файл pathExe.txt найден. Отправляю запрос на localhost:5000/api/post/reconnect
    curl -X POST http://localhost:5000/api/post/reconnect
    timeout /t 2 /nobreak > nul
    start "" "Client/CameraControllerClient.exe"
    @REM start /B "" "Client/CameraControllerClient.exe"
    if %errorlevel% neq 0 (
        echo Ошибка при отправке запроса. Запускаю приложения как обычно.
        start "" "Server/Api.exe"
        @REM start /B "" "Server/Api.exe"
        timeout /t 2 /nobreak > nul
        start "" "Camera/CameraControl.exe"
        timeout /t 2 /nobreak > nul
        start "" "Client/CameraControllerClient.exe"
        @REM start /B "" "Client/CameraControllerClient.exe"
    )
) else (
    echo Файл pathExe.txt не найден. Запускаю приложения как обычно.
    start /B "" "Server/Api.exe"
    timeout /t 2 /nobreak > nul
    start /B "" "Camera/CameraControl.exe"
    timeout /t 2 /nobreak > nul
    start /B "" "Client/CameraControllerClient.exe"
    timeout /t 5 /nobreak > nul
    curl -X POST http://localhost:5000/api/post/reconnect
)