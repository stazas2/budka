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

const config = loadConfig()
const basePath = config.basePath

let mainWindow
let cameraCheckInterval

app.whenReady().then(() => {
  if (config.cameraMode === "canon") {
    exec("start.bat", { cwd: `./canon` }, (error, stdout, stderr) => {
      if (error) {
        console.error("Не удалось запустить Canon камеру:", error)
        return
      }
      console.log(stdout || stderr)
    })
  }
  mainWindow = createWindow()

  if (config.cameraMode === "canon") {
    cameraCheckInterval = setInterval(checkCameraControlProcess, 1000)
  }
})

setupIpcHandlers()

app.on("before-quit", () => {
  try {
    if (config.cameraMode === "canon") {
      console.log("Закрытие Canon-приложения...")
      execSync("taskkill /IM Api.exe /F")
      execSync("taskkill /IM CameraControl.exe /F")
      execSync("taskkill /IM CameraControllerClient.exe /F")
    }
  } catch (error) {
    console.error("Не удалось закрыть приложение Canon камеры:", error)
  }
})

app.on("window-all-closed", () => {
  app.quit()
})

app.on("error", (error) => {
  console.error("Ошибка приложения:", error)
})

process.on("uncaughtException", (error) => {
  console.error("Неперехваченное исключение:", error)
})

process.on("unhandledRejection", (error) => {
  console.error("Необработанное отклонение:", error)
})

function checkCameraControlProcess() {
  exec(
    'tasklist /FI "IMAGENAME eq CameraControl.exe"',
    (error, stdout, stderr) => {
      if (error) {
        console.error("Ошибка выполнения tasklist:", error)
        return
      }
      const isRunning = stdout.includes("CameraControl.exe")
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send("camera-control-status", isRunning)
      }
      if (isRunning && cameraCheckInterval) {
        clearInterval(cameraCheckInterval)
        console.log(
          "CameraControl.exe обнаружен; дальнейшие проверки остановлены."
        )
      }
    }
  )
}

// Опционально: мониторинг нагрузки системы
function monitorSystemLoad() {
  setInterval(async () => {
    try {
      const cpuLoad = await si.currentLoad()
      console.log(`Загрузка CPU: ${cpuLoad.currentLoad.toFixed(2)}%`)
    } catch (error) {
      console.error("Ошибка при получении загрузки CPU:", error)
    }
    exec(
      "nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits",
      (error, stdout, stderr) => {
        if (error) {
          console.error("Ошибка при получении загрузки GPU:", error)
          return
        }
        console.log(`Загрузка GPU: ${stdout.trim()}%`)
      }
    )
  }, 5000)
}

// monitorSystemLoad(); // Раскомментируйте при необходимости