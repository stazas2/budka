// main.js
const { app, BrowserWindow, ipcMain } = require("electron")
const path = require("path")
const fs = require("fs")
const os = require("os")
const { print } = require("pdf-to-printer")
const si = require("systeminformation")
const { exec, execSync } = require("child_process")
const { createWindow } = require("./windowManager")
const { setupIpcHandlers } = require("./ipcHandlers")
const { loadConfig } = require("./utils/configLoader")

console.log("Запуск main.js...");
try {
  const config = loadConfig()
  console.log("Конфигурация загружена:", config);
  const basePath = config.basePath || path.join(__dirname, "..") // Фallback, если basePath отсутствует
  console.log("Базовый путь:", basePath);
} catch (error) {
  console.error("Ошибка загрузки конфигурации:", error);
}

let mainWindow
let cameraCheckInterval

app.whenReady().then(() => {
  console.log("Приложение готово к запуску");
  const config = loadConfig(); // Перезагружаем конфигурацию здесь для безопасности
  if (!config || typeof config !== "object") {
    console.error("Конфигурация недоступна, использование значений по умолчанию");
    config = { cameraMode: "pc", basePath: path.join(__dirname, "..") }; // Фallback
  }
  if (config.cameraMode === "canon") {
    console.log("Запуск Canon-приложения через start.bat...");
    exec("start.bat", { cwd: `./canon` }, (error, stdout, stderr) => {
      if (error) {
        console.error("Ошибка запуска Canon:", error.message);
        console.error("Код ошибки:", error.code);
        console.error("Сигнал:", error.signal);
        console.error("Вывод ошибки:", stderr);
      } else {
        console.log("Вывод Canon-приложения:", stdout || stderr);
      }
    });
  } else {
    console.log("Режим камеры не Canon, пропускаем запуск start.bat");
  }
  try {
    mainWindow = createWindow();
    console.log("Окно создано");
  } catch (error) {
    console.error("Ошибка создания окна:", error);
  }

  if (config.cameraMode === "canon") {
    cameraCheckInterval = setInterval(checkCameraControlProcess, 1000);
    console.log("Запущена проверка CameraControl.exe");
  }
});

setupIpcHandlers();

app.on("before-quit", () => {
  try {
    const config = loadConfig();
    if (config && config.cameraMode === "canon") {
      console.log("Закрытие Canon-приложения...");
      execSync("taskkill /IM Api.exe /F");
      execSync("taskkill /IM CameraControl.exe /F");
      execSync("taskkill /IM CameraControllerClient.exe /F");
    }
  } catch (error) {
    console.error("Не удалось закрыть приложение Canon камеры:", error);
  }
});

app.on("window-all-closed", () => {
  console.log("Все окна закрыты, завершение приложения");
  app.quit()
});

app.on("error", (error) => {
  console.error("Ошибка приложения:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Неперехваченное исключение:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Необработанное отклонение:", error);
});

function checkCameraControlProcess() {
  const config = loadConfig();
  if (config && config.cameraMode === "canon") {
    exec('tasklist /FI "IMAGENAME eq CameraControl.exe"', (error, stdout, stderr) => {
      if (error) {
        console.error("Ошибка выполнения tasklist:", error);
        return;
      }
      const isRunning = stdout.includes("CameraControl.exe")
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send("camera-control-status", isRunning);
      }
      if (isRunning && cameraCheckInterval) {
        clearInterval(cameraCheckInterval);
        console.log("CameraControl.exe обнаружен; дальнейшие проверки остановлены.");
      }
    });
  }
}