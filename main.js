const { app, ipcMain } = require("electron")
const path = require("path")
const { loadConfig } = require("./utils/configLoader")

// Import our modules
const { createWindow, getMainWindow } = require("./modules/windowManager")
const { printPhoto, getDefaultPrinter } = require("./modules/printService")
const { 
  initCamera, 
  startCameraMonitoring, 
  shutdownCamera 
} = require("./modules/cameraManager")
const { getStyles } = require("./modules/styleManager")
const { startMonitoring } = require("./modules/systemMonitor")

// Загружаем конфигурацию
const config = loadConfig()

/** Начало измерения времени запуска main процесса */
const mainStartupTimeStart = Date.now()

// Обработчик печати фотографии
ipcMain.on("print-photo", async (event, data) => {
  await printPhoto(data)
})

// Обработчик запроса стилей
ipcMain.handle("get-styles", async (event, genders) => {
  return await getStyles(genders)
})

// Если приложение-canon запущено, то не запускаем его повторно
app.whenReady().then(() => {
  // Выводим информацию о принтере
  getDefaultPrinter().then(console.log)
  
  // Инициализируем камеру
  initCamera()
  
  // Создаем окно приложения
  const mainWindow = createWindow()
  
  // Запускаем мониторинг камеры, если нужно
  if (config.cameraMode === "canon") {
    startCameraMonitoring(mainWindow)
  }
  
  // Раскомментировать для включения мониторинга системы
  // startMonitoring(5000)
})

app.on("before-quit", () => {
  shutdownCamera()
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
