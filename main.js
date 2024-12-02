const { app, BrowserWindow, ipcMain } = require("electron")
const path = require("path")
const fs = require("fs")
const os = require("os")
const { PDFDocument } = require("pdf-lib")
const { print } = require("pdf-to-printer")
const { loadConfig } = require("./utils/configLoader")
const si = require("systeminformation")
const { exec } = require("child_process")

// Загружаем конфигурацию после импорта необходимых модулей
const config = loadConfig()
const basePath = config.basePath
const stylesDir = config.stylesDir.replace("{{basePath}}", basePath)

/** Начало измерения времени запуска main процесса */
const mainStartupTimeStart = Date.now()

function createWindow() {
  console.log("Creating main window...")
  try {
    const win = new BrowserWindow({
      width: 1080,
      height: 1620,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
      autoHideMenuBar: true,
    })

    win.setMenuBarVisibility(false)
    win.loadFile("index.html")
    // monitorSystemLoad(); // Запуск мониторинга при старте приложения

    win.webContents.on("did-finish-load", () => {
      console.log("Window loaded successfully")
      win.webContents.setZoomFactor(1)

      // Логирование времени запуска
      // const mainStartupTimeEnd = Date.now()
      // const startupDuration = mainStartupTimeEnd - mainStartupTimeStart
      // console.log(`Время запуска main процесса: ${startupDuration} мс`)
    })

    win.on("error", (error) => {
      console.error("Window error:", error)
    })
  } catch (error) {
    console.error("Failed to create window:", error)
    app.quit()
  }
}

// Изменение обработчика 'get-styles' для оптимизации загрузки стилей
ipcMain.handle("get-styles", async (event, gender) => {
  // const stylesDir = config?.stylesDir || path.join(basePath, 'styles')
  console.log(
    `Loading styles for gender "${gender}" from directory: ${stylesDir}`
  )

  try {
    if (!gender) {
      console.warn("Gender not provided. Returning empty styles list.")
      return []
    }

    const genderDir = path.join(stylesDir, gender)
    console.log(`Gender directory path: ${genderDir}`)
    if (!fs.existsSync(genderDir)) {
      console.warn(`Gender directory does not exist: ${genderDir}`)
      return []
    }

    const styleFolders = fs
      .readdirSync(genderDir, { encoding: "utf8" })
      .filter((folder) =>
        fs.statSync(path.join(genderDir, folder)).isDirectory()
      )
    const styles = []

    for (const folder of styleFolders) {
      const folderPath = path.join(genderDir, folder)
      // console.log(`Checking style folder: ${folderPath}`)
      const files = fs.readdirSync(folderPath, { encoding: "utf8" })
      const imageFiles = files.filter(
        (file) => /\.(jpg|jpeg|png)$/i.test(file) && !file.startsWith("1")
      )

      if (imageFiles.length > 0) {
        styles.push({
          originalName: folder,
          displayName: folder,
        })
      }
    }

    if (styles.length === 0) {
      console.warn("No style images found in gender directory")
      return []
    }

    // console.log(`Styles found: ${styles.length}`)
    return styles
  } catch (error) {
    console.error("Error reading styles directory:", error)
    return []
  }
})

ipcMain.on("print-photo", async (event, data) => {
  if (!data || !data.imageData) {
    console.error("Error: imageData not provided or invalid.")
    return
  }

  const {
    imageData,
    isLandscape,
    logoPosition = "bottom-right",
    offset = 30,
  } = data
  console.log("print-photo event received in main.js")
  console.log(`Image orientation: ${isLandscape ? "landscape" : "portrait"}`)

  try {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "print-"))
    const imageFileName = "image.jpg"
    const pdfFileName = "print.pdf"
    const tempImagePath = path.join(tempDir, imageFileName)
    const tempPdfPath = path.join(tempDir, pdfFileName)
    const logoPath = config.logoPath // Загружаем путь к логотипу из конфигурации

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "")
    const buffer = Buffer.from(base64Data, "base64")
    fs.writeFileSync(tempImagePath, buffer)
    console.log(`Image saved: ${tempImagePath}`)

    if (!fs.existsSync(logoPath)) {
      console.warn("Logo file not found at path:", logoPath)
    }

    await addLogoToPdf(
      tempImagePath,
      tempPdfPath,
      logoPath,
      logoPosition,
      offset
    )
    await print(tempPdfPath)
    console.log("Print job started.")

    fs.unlinkSync(tempPdfPath)
    fs.unlinkSync(tempImagePath)
    fs.rmdirSync(tempDir)
    console.log("Temporary files deleted.")
  } catch (error) {
    console.error("Error during printing process:", error)
  }
})

async function addLogoToPdf(
  tempImagePath,
  tempPdfPath,
  logoPath,
  logoPosition,
  offset
) {
  console.log("Adding logo to PDF...")
  try {
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage()

    console.log("Reading image file...")
    const imageBytes = fs.readFileSync(tempImagePath)
    const extension = path.extname(tempImagePath).toLowerCase()

    let embeddedImage
    if (extension === ".jpg" || extension === ".jpeg") {
      embeddedImage = await pdfDoc.embedJpg(imageBytes)
    } else if (extension === ".png") {
      embeddedImage = await pdfDoc.embedPng(imageBytes)
    } else {
      throw new Error(`Unsupported image format: ${extension}`)
    }

    const { width, height } = embeddedImage.scale(1)
    console.log(`Image dimensions: ${width}x${height}`)

    page.setSize(width, height)
    page.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: width,
      height: height,
    })

    // Добавление логотипа
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath)
      const logoExtension = path.extname(logoPath).toLowerCase()
      let embeddedLogo
      if (logoExtension === ".jpg" || logoExtension === ".jpeg") {
        embeddedLogo = await pdfDoc.embedJpg(logoBytes)
      } else if (logoExtension === ".png") {
        embeddedLogo = await pdfDoc.embedPng(logoBytes)
      } else {
        console.warn(
          `Unsupported logo format: ${logoExtension}. Skipping logo.`
        )
      }

      if (embeddedLogo) {
        const { width: logoWidth, height: logoHeight } = embeddedLogo.scale(1)
        let x = 0
        let y = 0

        // Определение позиции логотипа в зависимости от logoPosition
        switch (logoPosition) {
          case "top-left":
            x = offset
            y = height - logoHeight - offset
            break
          case "top-right":
            x = width - logoWidth - offset
            y = height - logoHeight - offset
            break
          case "bottom-left":
            x = offset
            y = offset
            break
          case "bottom-right":
            x = width - logoWidth - offset
            y = offset
            break
          case "center":
            x = (width - logoWidth) / 2
            y = (height - logoHeight) / 2
            break
          case "center-top":
            x = (width - logoWidth) / 2
            y = height - logoHeight - offset
            break
          case "center-bottom":
            x = (width - logoWidth) / 2
            y = offset
            break
          default:
            console.warn(
              `Invalid logo position: ${logoPosition}. Defaulting to bottom-right.`
            )
            x = width - logoWidth - offset
            y = offset
            break
        }

        page.drawImage(embeddedLogo, {
          x: x,
          y: y,
          width: logoWidth,
          height: logoHeight,
        })
      }
    } else {
      console.warn("Logo file not found. Skipping logo overlay.")
    }

    const pdfBytes = await pdfDoc.save()
    fs.writeFileSync(tempPdfPath, pdfBytes)
    console.log(`PDF created successfully: ${tempPdfPath}`)
  } catch (error) {
    console.error("Failed to create PDF:", error)
    throw error
  }
}

// TEST
// Функция для мониторинга ЦП и GPU
function monitorSystemLoad() {
  // Мониторинг загрузки CPU
  setInterval(async () => {
    try {
      const cpuLoad = await si.currentLoad()
      console.log(`CPU Load: ${cpuLoad.currentLoad.toFixed(2)}%`)
    } catch (error) {
      console.error("Error getting CPU load:", error)
    }

    // Мониторинг GPU через nvidia-smi
    exec(
      "nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits",
      (error, stdout, stderr) => {
        if (error) {
          console.error("Error getting GPU load:", error)
          return
        }
        console.log(`GPU Load: ${stdout.trim()}%`)
      }
    )
  }, 5000) // Обновление каждые 5 секунд
}

app.whenReady().then(createWindow)

app.on("window-all-closed", () => {
  app.quit()
})

// Обработчик ошибок приложения
app.on("error", (error) => {
  console.error("Application error:", error)
})

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error)
})

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error)
})
