const { app, ipcMain } = require("electron")
const path = require("path")
const { loadConfig } = require("./utils/configLoader")

// Загружаем конфигурацию
const config = loadConfig() || {}

/** Начало измерения времени запуска main процесса */
const mainStartupTimeStart = Date.now()

// Обработчик печати фотографии
ipcMain.on("print-photo", async (event, data) => {
  try {
    const printService = require("./modules/printService")
    await printService.printPhoto(data)
    event.reply('print-success', true)
  } catch (error) {
    console.error('Print error:', error)
    event.reply('print-error', error.message)
  }
})

// Обработчик запроса стилей
ipcMain.handle("get-styles", async (event, genders = ['any']) => {
  try {
    const styleManager = require("./modules/styleManager")
    return await styleManager.getStyles(genders)
  } catch (error) {
    console.error('Get styles error:', error)
    return []
  }
})

// Register the 'ready' event handler
app.on("ready", async () => {
  try {
    // Import modules in a way that Jest can properly mock
    const windowManager = require("./modules/windowManager")
    const printService = require("./modules/printService")
    const cameraManager = require("./modules/cameraManager")
    const systemMonitor = require("./modules/systemMonitor")
    
    // Initialize the application
    // Выводим информацию о принтере
    const printer = await printService.getDefaultPrinter() || { name: 'No printer found' }
    console.log('Default printer:', printer)
    
    // Инициализируем камеру
    await cameraManager.initCamera()
    
    // Создаем окно приложения
    const mainWindow = windowManager.createWindow()
    
    // Запускаем мониторинг камеры
    cameraManager.startCameraMonitoring(mainWindow)
    
    // Start system monitoring with 10 second interval
    systemMonitor.startMonitoring(10000)
  } catch (error) {
    console.error('Error during app initialization:', error)
  }
})

app.on("before-quit", () => {
  try {
    const cameraManager = require("./modules/cameraManager")
    cameraManager.shutdownCamera()
  } catch (error) {
    console.error('Error during camera shutdown:', error)
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
