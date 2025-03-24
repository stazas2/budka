!ifndef DOTNET_RUNTIME_VERSION
  !define DOTNET_RUNTIME_VERSION "9.0.2"
!endif
!ifndef DOTNET_RUNTIME_URL
  !define DOTNET_RUNTIME_URL "https://builds.dotnet.microsoft.com/dotnet/Runtime/9.0.2/dotnet-runtime-9.0.2-win-x64.exe"
!endif
!ifndef DOTNET_RUNTIME_INSTALLER
  !define DOTNET_RUNTIME_INSTALLER "$INSTDIR\resources\dotnet-runtime-9.0.2-win-x64.exe"
!endif


!ifndef ASPNETCORE_RUNTIME_VERSION
  !define ASPNETCORE_RUNTIME_VERSION "9.0.2"
!endif
!ifndef ASPNETCORE_RUNTIME_URL
!define ASPNETCORE_RUNTIME_URL "https://builds.dotnet.microsoft.com/dotnet/aspnetcore/Runtime/9.0.2/aspnetcore-runtime-9.0.2-win-x64.exe"
!endif
!ifndef ASPNETCORE_RUNTIME_INSTALLER
!define ASPNETCORE_RUNTIME_INSTALLER "$INSTDIR\resources\aspnetcore-runtime-9.0.2-win-x64.exe"
!endif



Function .onInstSuccess
  ; Даём время распаковке
  Sleep 3000

  ; --- 1) Установка .NET Runtime ---
  IfFileExists "${DOTNET_RUNTIME_INSTALLER}" dotnet_runtime_install dotnet_runtime_download
  Goto aspnetcore_check

dotnet_runtime_download:
  MessageBox MB_OK "Файл .NET Runtime ${DOTNET_RUNTIME_VERSION} не найден. Начинаю скачивание..."
  nsExec::ExecToLog 'powershell -ExecutionPolicy Bypass -NoProfile -Command "& {Start-BitsTransfer -Source \"${DOTNET_RUNTIME_URL}\" -Destination \"${DOTNET_RUNTIME_INSTALLER}\"}"'
  IfErrors dotnet_runtime_retry
  Goto dotnet_runtime_install

dotnet_runtime_retry:
  nsExec::ExecToLog 'powershell -ExecutionPolicy Bypass -NoProfile -Command "& {Invoke-WebRequest -Uri \"${DOTNET_RUNTIME_URL}\" -OutFile \"${DOTNET_RUNTIME_INSTALLER}\"}"'
  IfErrors 0 dotnet_runtime_install
  MessageBox MB_OK "Ошибка скачивания .NET Runtime ${DOTNET_RUNTIME_VERSION}! Проверьте интернет."
  Goto end

dotnet_runtime_install:
  MessageBox MB_OK "Запуск установки .NET Runtime ${DOTNET_RUNTIME_VERSION}..."
  nsExec::ExecToLog '"${DOTNET_RUNTIME_INSTALLER}" /quiet /norestart'
  IfErrors 0 +2
  MessageBox MB_OK "Ошибка установки .NET Runtime ${DOTNET_RUNTIME_VERSION}!"
  ; Переходим к проверке ASP.NET Core
  Goto aspnetcore_check

  ; --- 2) Установка ASP.NET Core Runtime ---
aspnetcore_check:
  IfFileExists "${ASPNETCORE_RUNTIME_INSTALLER}" aspnetcore_install aspnetcore_download
  Goto end

aspnetcore_download:
  MessageBox MB_OK "Файл ASP.NET Core Runtime ${ASPNETCORE_RUNTIME_VERSION} не найден. Начинаю скачивание..."
  nsExec::ExecToLog 'powershell -ExecutionPolicy Bypass -NoProfile -Command "& {Start-BitsTransfer -Source \"${ASPNETCORE_RUNTIME_URL}\" -Destination \"${ASPNETCORE_RUNTIME_INSTALLER}\"}"'
  IfErrors aspnetcore_retry
  Goto aspnetcore_install

aspnetcore_retry:
  nsExec::ExecToLog 'powershell -ExecutionPolicy Bypass -NoProfile -Command "& {Invoke-WebRequest -Uri \"${ASPNETCORE_RUNTIME_URL}\" -OutFile \"${ASPNETCORE_RUNTIME_INSTALLER}\"}"'
  IfErrors 0 aspnetcore_install
  MessageBox MB_OK "Ошибка скачивания ASP.NET Core Runtime ${ASPNETCORE_RUNTIME_VERSION}! Проверьте интернет."
  Goto end

aspnetcore_install:
  MessageBox MB_OK "Запуск установки ASP.NET Core Runtime ${ASPNETCORE_RUNTIME_VERSION}..."
  nsExec::ExecToLog '"${ASPNETCORE_RUNTIME_INSTALLER}" /quiet /norestart'
  IfErrors 0 +2
  MessageBox MB_OK "Ошибка установки ASP.NET Core Runtime ${ASPNETCORE_RUNTIME_VERSION}!"

end:
FunctionEnd
