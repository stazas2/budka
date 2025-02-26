const { BrowserWindow } = require("electron")

let mainWindow

function createWindow() {
  console.log("Создание главного окна...")
  try {
    mainWindow = new BrowserWindow({
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
    throw error
  }
}

module.exports = {
  createWindow,
  getMainWindow: () => mainWindow
}
