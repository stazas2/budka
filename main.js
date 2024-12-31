const { app, BrowserWindow, ipcMain } = require("electron")
const path = require("path")
const fs = require("fs")
const os = require("os")
const { PDFDocument, degrees } = require("pdf-lib")
const { print, list } = require("pdf-to-printer")
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
  // // Получение списка принтеров
  // exec('wmic printer get name', (err, stdout, stderr) => {
  //   if (err) {
  //     console.error('Ошибка при получении списка принтеров:', err);
  //     return;
  //   }
  //   console.log('Доступные принтеры:');
  //   console.log(stdout);
  // });

  console.log("Creating main window...")
  try {
    const win = new BrowserWindow({
      width: 1080,
      height: 1440,
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

ipcMain.handle("get-styles", async (event, genders) => {
  console.log(
    `Loading styles for genders "${(genders || []).join(
      ", "
    )}" from directory: ${stylesDir}`
  )
  try {
    if (!genders || genders.length === 0) {
      console.warn("Genders not provided. Returning empty styles list.")
      return []
    }

    const styles = new Set()
    let files = []
    for (const gender of genders) {
      const genderDir = path.join(stylesDir, gender)
      if (!fs.existsSync(genderDir)) {
        console.warn(`Gender directory does not exist: ${genderDir}`)
        continue
      }

      const folders = fs
        .readdirSync(genderDir, { encoding: "utf8" })
        .filter((folder) => {
          const folderPath = path.join(genderDir, folder)
          return fs.statSync(folderPath).isDirectory()
        })

      for (const folder of folders) {
        const folderPath = path.join(genderDir, folder)
        files = fs.readdirSync(folderPath, { encoding: "utf8" })

        const imageFiles = files.filter(
          (file) => /\.(jpg|jpeg|png)$/i.test(file) && !file.startsWith(`1${folder}`)
        )
        if (imageFiles.length > 0) {
          styles.add({ originalName: folder, displayName: folder })
        }
      }
    }

    if (styles.size === 0) {
      console.warn("No style images found for the provided genders")
      return []
    }

    return Array.from(styles)
  } catch (error) {
    console.error("Error reading styles directory:", error)
    return []
  }
})

ipcMain.on("print-photo", async (event, data) => {
  //todo показать
  const options = {
    orientation: "portrait", // landscape
    // printer: "Имя принтера", // Удалите для принтера по умолчанию
  };

  if (!data || !data.imageData) {
    console.error("Error: imageData not provided or invalid.")
    return
  }

  const { imageData, isLandscape } = data
  console.log("print-photo event received in main.js")
  console.log(`Image orientation: ${isLandscape ? "landscape" : "portrait"}`)
  console.log('imageData:   ' + imageData)

  try {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "print-"))
    const imageFileName = "image.jpg"
    const pdfFileName = "print.pdf"
    const tempImagePath = path.join(tempDir, imageFileName)
    const tempPdfPath = path.join(tempDir, pdfFileName)

    const response = await fetch(imageData)
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    fs.writeFileSync(tempImagePath, buffer)
    console.log(`Image saved: ${tempImagePath}`)

    await createPdf(
      tempImagePath,
      tempPdfPath,
      isLandscape
    )
    await print(tempPdfPath, options)
    console.log("Print job started.")

    fs.unlinkSync(tempPdfPath)
    fs.unlinkSync(tempImagePath)
    fs.rmdirSync(tempDir)
    console.log("Temporary files deleted.")
  } catch (error) {
    console.error("Error during printing process:", error)
  }
})

async function createPdf(
  tempImagePath,
  tempPdfPath,
  isLandscape
) {
  console.log("Adding logo to PDF...")
  try {
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage()

    //? page.setRotation(degrees(90))

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

    //todo показать
  //   const page = isLandscape
  //   ? pdfDoc.addPage([width, height]) // Горизонтальная страница
  //   : pdfDoc.addPage([height, width]); // Вертикальная страница

  // page.drawImage(embeddedImage, {
  //   x: 0,
  //   y: 0,
  //   width: isLandscape ? width : height,
  //   height: isLandscape ? height : width,
  // });

    //todo - расстягивает ищзображение
    //todo - поля
      page.setSize(width, height)
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width,
        height,
        //? rotate: degrees(90),
      })

    const pdfBytes = await pdfDoc.save()
    fs.writeFileSync(tempPdfPath, pdfBytes)
    console.log(`PDF created successfully: ${tempPdfPath}`)
  } catch (error) {
    console.error("Failed to create PDF:", error)
    throw error
  }
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