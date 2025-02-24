// windowManager.js
const { BrowserWindow } = require("electron")

function createWindow() {
  console.log("Создание главного окна...")
  try {
    const mainWindow = new BrowserWindow({
      width: 1080,
      height: 1440,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
      autoHideMenuBar: true,
    })

    mainWindow.setMenuBarVisibility(false)
    mainWindow.loadFile("index.html")

    mainWindow.webContents.on("did-finish-load", () => {
      console.log("Окно успешно загружено")
      mainWindow.webContents.setZoomFactor(1)
    })

    mainWindow.on("error", (error) => {
      console.error("Ошибка окна:", error)
    })

    return mainWindow
  } catch (error) {
    console.error("Не удалось создать окно:", error)
    app.quit()
  }
}

module.exports = { createWindow }