const { exec, execSync } = require("child_process")
const { loadConfig } = require("../utils/configLoader")

const config = loadConfig()
let cameraCheckInterval = null

function initCamera() {
  if (config.cameraMode === "canon") {
    exec("start.bat", { cwd: `./canon` }, (error, stdout, stderr) => {
      if (error) {
        console.error("Не удалось запустить Canon камеру:", error)
        return
      }
      console.log(stdout || stderr)
    })
  }
}

function startCameraMonitoring(mainWindow) {
  if (config.cameraMode === "canon") {
    cameraCheckInterval = setInterval(() => {
      checkCameraControlProcess(mainWindow)
    }, 1000)
    return cameraCheckInterval
  }
  return null
}

function checkCameraControlProcess(mainWindow) {
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

function shutdownCamera() {
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
}

module.exports = {
  initCamera,
  startCameraMonitoring,
  checkCameraControlProcess,
  shutdownCamera
}
