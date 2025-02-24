const { BrowserWindow } = require("electron")

function createWindow() {
  console.log("Создание главного окна...");
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
    })

    mainWindow.on("error", (error) => {
      console.error("Ошибка окна:", error)
    })

    return mainWindow
  } catch (error) {
    console.error("Не удалось создать окно:", error)
    throw error; // Добавим, чтобы ошибка была видна в main.js
  }
}

module.exports = { createWindow }