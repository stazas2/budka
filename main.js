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
const config = loadConfig() || {}

/** Начало измерения времени запуска main процесса */
const mainStartupTimeStart = Date.now()

// Обработчик печати фотографии
ipcMain.on("print-photo", async (event, data) => {
  try {
    await printPhoto(data)
    event.reply('print-success', true)
  } catch (error) {
    console.error('Print error:', error)
    event.reply('print-error', error.message)
  }
})

// Обработчик запроса стилей
ipcMain.handle("get-styles", async (event, genders = ['any']) => {
  try {
    return await getStyles(genders)
  } catch (error) {
    console.error('Get styles error:', error)
    return []
  }
})

// Register the 'ready' event handler
app.on("ready", async () => {
  try {
    // Initialize the application
    // Выводим информацию о принтере
    const printer = await getDefaultPrinter() || { name: 'No printer found' }
    console.log('Default printer:', printer)
    
    // Инициализируем камеру
    await initCamera()
    
    // Создаем окно приложения
    const mainWindow = createWindow()
    
    // Запускаем мониторинг камеры, если нужно
    if (config.cameraMode === "canon") {
      startCameraMonitoring(mainWindow)
    } else if (config.cameraMode === "mock") {
      console.log('Using mock camera mode')
    }
    
    // Enable system monitoring if configured
    if (config.enableMonitoring) {
      startMonitoring(config.monitoringInterval || 5000)
    }
  } catch (error) {
    console.error('Error during app initialization:', error)
  }
});

// Use whenReady for any additional setup
app.whenReady().then(() => {
  // Any additional setup that's not covered in the "ready" event handler
}).catch(error => {
  console.error('Error in whenReady promise:', error)
})

app.on("before-quit", () => {
  try {
    shutdownCamera()
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
