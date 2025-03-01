const { app, ipcMain } = require("electron")
const path = require("path")
const { loadConfig } = require("./utils/configLoader")

// Loading configuration
const config = loadConfig() || {}

/** Start measuring main process startup time */
const mainStartupTimeStart = Date.now()

// Photo print handler
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

// Styles request handler
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
    // Outputting printer information
    const printer = await printService.getDefaultPrinter() || { name: 'No printer found' }
    console.log('Default printer:', printer)
    
    // Initializing camera
    await cameraManager.initCamera()
    
    // Creating application window
    const mainWindow = windowManager.createWindow()
    
    // Starting camera monitoring
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
  console.error("Application error:", error)
})

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error)
})

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error)
})
