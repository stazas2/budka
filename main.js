const { app, BrowserWindow, ipcMain } = require("electron")
const path = require("path")
const fs = require("fs")
const os = require("os")
const PDFDocument = require("pdfkit")
const { print, getDefaultPrinter } = require("pdf-to-printer")
const { loadConfig } = require("./utils/configLoader")
const si = require("systeminformation")
const { exec, execSync } = require("child_process") 

// Загружаем конфигурацию после импорта необходимых модулей
const config = loadConfig()
const basePath = config.basePath
const stylesDir = config.stylesDir.replace("{{basePath}}", basePath)
const borderPrintImage = config.borderPrintImage

/** Начало измерения времени запуска main процесса */
const mainStartupTimeStart = Date.now()

let mainWindow // new global variable
let cameraCheckInterval // New global variable for interval

// Функция создания окна приложения
function createWindow() {
  console.log("Создание главного окна...")
  try {
    getDefaultPrinter().then(console.log)

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
    // const url = `file://${__dirname}/index.html?cache_bust=${Date.now()}`
    // mainWindow.loadURL(url)

    // monitorSystemLoad(); // Запуск мониторинга при старте приложения

    mainWindow.webContents.on("did-finish-load", () => {
      console.log("Окно успешно загружено")
      mainWindow.webContents.setZoomFactor(1)

      // Логирование времени запуска
      // const mainStartupTimeEnd = Date.now()
      // const startupDuration = mainStartupTimeEnd - mainStartupTimeStart
      // console.log(`Время запуска main процесса: ${startupDuration} мс`)
    })
    // Получение списка принтеров
    // console.log(mainWindow.webContents.getPrinters());

    mainWindow.on("error", (error) => {
      console.error("Ошибка окна:", error)
    })
  } catch (error) {
    console.error("Не удалось создать окно:", error)
    app.quit()
  }
}

// Обработчик запроса стилей
ipcMain.handle("get-styles", async (event, genders) => {
  if (!genders || genders.length === 0) {
    console.warn("Гендеры не указаны. Возвращаю пустой список стилей.")
    return []
  }
  console.log(
    `Загрузка стилей для гендеров "${(genders || []).join(
      ", "
    )}" из директории: ${stylesDir}`
  )
  try {
    if (!genders || genders.length === 0) {
      console.warn("Гендеры не указаны. Возвращаю пустой список стилей.")
      return []
    }

    const styles = new Set()
    let files = []
    for (const gender of genders) {
      const genderDir = path.join(stylesDir, gender)
      if (!fs.existsSync(genderDir)) {
        console.warn(`Директория для гендера не существует: ${genderDir}`)
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
          (file) =>
            /\.(jpg|jpeg|png)$/i.test(file) && !file.startsWith(`1${folder}`)
        )
        if (imageFiles.length > 0) {
          styles.add({ originalName: folder, displayName: folder })
        }
      }
    }

    if (styles.size === 0) {
      console.warn("Не найдено стилей для указанных гендеров")
      return []
    }

    return Array.from(styles)
  } catch (error) {
    console.error("Ошибка чтения директории стилей:", error)
    return []
  }
})

// Обработчик печати фотографии
ipcMain.on("print-photo", async (event, data) => {
  if (!data || !data.imageData) {
    console.error("Ошибка: imageData не предоставлен или неверный.")
    return
  }

  const { imageData, isLandscape } = data
  console.log(`Image orientation: ${isLandscape ? "landscape" : "portrait"}`)

  try {
    let orientation = ""
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "print-"))
    const imageFileName = "image.jpg"
    const pdfFileName = "print.pdf"
    const tempImagePath = path.join(tempDir, imageFileName)
    const tempPdfPath = path.join(tempDir, pdfFileName)

    const response = await fetch(imageData)
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    fs.writeFileSync(tempImagePath, buffer)
    console.log(`Изображение сохранено: ${tempImagePath}`)

    // Генерация PDF
    const generatedPdfPath = await createPdf(
      tempImagePath,
      tempPdfPath,
      isLandscape
    )
    console.log(`Путь сгенерированного PDF: ${generatedPdfPath}`)

    if (config.orientation === "landscape") {
      orientation = "landscape"
    } else if (
      config.orientation === "portrait" ||
      config?.orientation.trim() === ""
    ) {
      orientation = "portrait"
    }

    const printOptions = {
      paperSize: "A6",
      orientation,
      scale: "fit",
      silent: true,
    }

    // Печать PDF
    await print(generatedPdfPath, printOptions)
    console.log("Печать началась.")

    // Удаление временных файлов
    fs.unlinkSync(tempPdfPath)
    fs.unlinkSync(tempImagePath)
    fs.rmdirSync(tempDir)
    console.log("Временные файлы удалены.")
  } catch (error) {
    console.error("Ошибка в процессе печати:", error)
  }
})

// Создание PDF-файла с изображением
async function createPdf(tempImagePath, tempPdfPath, isLandscape) {
  console.log("Добавление логотипа в PDF...")
  return new Promise((resolve, reject) => {
    try {
      const A6 = [1240, 1748] // Размеры A6 в точках
      const A6Landscape = [1748, 1240] // Размеры A6 в точках (альбомная ориентация)

      // Создаем новый документ PDF
      const doc = new PDFDocument({
        size: isLandscape ? A6Landscape : A6,
        margins: { top: 0, bottom: 0, left: 0, right: 0 }, // Убираем отступы
      })

      // Поток записи PDF-файла
      const writeStream = fs.createWriteStream(tempPdfPath)
      doc.pipe(writeStream)

      console.log("Чтение файла изображения...")
      const extension = path.extname(tempImagePath).toLowerCase()

      // Проверяем поддерживаемые форматы изображений
      if (
        extension !== ".jpg" &&
        extension !== ".jpeg" &&
        extension !== ".png"
      ) {
        throw new Error(`Неподдерживаемый формат изображения: ${extension}`)
      }

      // todo
      if (!borderPrintImage) {
        ;[width, height] = [
          ...doc.image(tempImagePath, 0, 0, {
            width: isLandscape ? A6Landscape[0] : A6[0], // Полная ширина страницы
            height: isLandscape ? A6[0] : A6Landscape[0], // Полная высота страницы
          }).options.size,
        ]
      } else {
        ;[width, height] = [
          ...doc
            .image(tempImagePath, 0, 0, {
              fit: isLandscape ? A6Landscape : A6,
              align: "center",
              valign: "center",
            })
            .scale(1).options.size,
        ]
      }

      console.log(`Размеры изображения: ${width} x ${height}`)

      console.log("Завершаю создание PDF...")
      doc.end()

      // Завершаем выполнение при завершении потока
      writeStream.on("finish", () => {
        console.log(`PDF успешно создан: ${tempPdfPath}`)
        resolve(tempPdfPath) // Возвращаем путь к файлу
      })

      writeStream.on("error", (err) => {
        console.error("Ошибка при записи PDF:", err)
        reject(err) // Отклоняем Promise при ошибке
      })
    } catch (error) {
      console.error("Не удалось создать PDF:", error)
      reject(error)
    }
  })
}

// Если приложение-canon запущено, то не запускаем его повторно
// app.whenReady().then(() => {
//   if (config.cameraMode === "canon") {
//     // Проверка запущенных процессов
//     exec("tasklist", (error, stdout, stderr) => {
//       if (error) {
//         console.error("Error executing tasklist:", error);
//         return;
//       }

//       const processes = ["Api.exe", "CameraControl.exe"];
//       const runningProcesses = processes.filter(process => stdout.includes(process));

//       if (runningProcesses.length === processes.length) {
//         console.log("All required processes are already running.");
//       } else {
//         exec("start.bat", { cwd: `./canon` }, (error, stdout, stderr) => {
//           if (error) {
//             console.error("Could not start Canon camera:", error);
//             return;
//           }
//           console.log(stdout || stderr);
//         });
//       }
//     });
//   }
//   createWindow();
// });

// !
app.whenReady().then(() => {
  if (config.cameraMode === "canon") {
    exec("start.bat", { cwd: `./canon` }, (error, stdout, stderr) => {
      if (error) {
        console.error("Не удалось запустить Canon камеру:", error)
        return
      }
      console.log(stdout || stderr)
    })

    //   exec(
    //     `"${process.env.COMSPEC}" /c start.bat`,
    //     { cwd: `${basePath}/canon` },
    //     (error, stdout, stderr) => {
    //       if (error) {
    //         console.error("Could not start Canon camera:", error);
    //         return;
    //       }
    //       console.log(stdout || stderr);
    //     }
    //   );
    // }
  }
  createWindow()

  if (config.cameraMode === "canon") {
    // Start checking camera control process; stop when true
    cameraCheckInterval = setInterval(checkCameraControlProcess, 1000)
  }
})

// New function to check for CameraControl.exe process and send status to renderer
function checkCameraControlProcess() {
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
      // If process is running, clear interval to stop further checks
      if (isRunning && cameraCheckInterval) {
        clearInterval(cameraCheckInterval)  
        console.log("CameraControl.exe обнаружен; дальнейшие проверки остановлены.")
      }
    }
  )
}

// // //! Одновременное закрытие приложения и Canon camera application
app.on("before-quit", () => {
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
})
// !

app.on("window-all-closed", () => {
  app.quit()
})

// Обработчик ошибок приложения
app.on("error", (error) => {
  console.error("Ошибка приложения:", error)
})

process.on("uncaughtException", (error) => {
  console.error("Неперехваченное исключение:", error)
})

process.on("unhandledRejection", (error) => {
  console.error("Необработанное отклонение:", error)
})

// TEST
// Функция для мониторинга ЦП и GPU
function monitorSystemLoad() {
  // Мониторинг загрузки CPU
  setInterval(async () => {
    try {
      const cpuLoad = await si.currentLoad()
      console.log(`Загрузка CPU: ${cpuLoad.currentLoad.toFixed(2)}%`)
    } catch (error) {
      console.error("Ошибка при получении загрузки CPU:", error)
    }

    // Мониторинг GPU через nvidia-smi
    exec(
      "nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits",
      (error, stdout, stderr) => {
        if (error) {
          console.error("Ошибка при получении загрузки GPU:", error)
          return
        }
        console.log(`Загрузка GPU: ${stdout.trim()}%`)
      }
    )
  }, 5000) // Обновление каждые 5 секунд
}
