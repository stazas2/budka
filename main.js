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

let mainWindow 
let cameraCheckInterval 

let launcherWindow = null;
let emptyWindow = null;

function createLauncherWindow() {
  launcherWindow = new BrowserWindow({
    width: 900,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  launcherWindow.loadFile('launcher.html');

  launcherWindow.on('closed', () => {
    if (mainWindow) mainWindow.close();
    if (emptyWindow) emptyWindow.close();
    launcherWindow = null;
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 1440,
    show: false, // Don't show until requested
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true,
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile("index.html");

  mainWindow.webContents.on("did-finish-load", () => {
    console.log("Окно фотобудки успешно загружено");
    mainWindow.webContents.setZoomFactor(1);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.on("error", (error) => {
    console.error("Ошибка окна фотобудки:", error);
  });
}

function createEmptyWindow() {
  emptyWindow = new BrowserWindow({
    width: 1080,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  emptyWindow.loadFile('empty.html');

  emptyWindow.on('closed', () => {
    emptyWindow = null;
  });
}

app.whenReady().then(() => {
  if (config.cameraMode === "canon") {
    exec("start.bat", { cwd: `./canon` }, (error, stdout, stderr) => {
      if (error) {
        console.error("Не удалось запустить Canon камеру:", error)
        return
      }
      console.log(stdout || stderr)
    })
  }
  createLauncherWindow();
  
  // Pre-create the main window but keep it hidden
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createLauncherWindow();
    }
  });

  if (config.cameraMode === "canon") {
    cameraCheckInterval = setInterval(checkCameraControlProcess, 1000)
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Centralized function to set the selected folder path
function setSelectedFolder(folderPath) {
  console.log('Setting selected folder:', folderPath);
  global.selectedFolderPath = folderPath;
}

// IPC handlers for launcher buttons
ipcMain.on('open-main-window', (event, folderPath) => {
  if (emptyWindow) {
    emptyWindow.close();
    emptyWindow = null;
  }

  setSelectedFolder(folderPath);

  if (mainWindow === null) {
    createMainWindow();
  }
  mainWindow.show();
});

ipcMain.on('open-empty-window', (event, folderPath) => {
  if (mainWindow) {
    mainWindow.close();
    mainWindow = null;
  }

  setSelectedFolder(folderPath);

  if (emptyWindow === null) {
    createEmptyWindow();
  } else {
    emptyWindow.show();
  }
});

// Consolidated handler for selected folder
ipcMain.on('selected-folder', (event, folderPath) => {
  setSelectedFolder(folderPath);
});

ipcMain.on('close-app', () => {
  app.quit();
});

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
        const files = fs.readdirSync(folderPath, { encoding: "utf8" })

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

    // Генерация PDF с учетом новой логики
    const generatedPdfPath = await createPdf(
      tempImagePath,
      tempPdfPath,
      isLandscape
    )
    console.log(`Путь сгенерированного PDF: ${generatedPdfPath}`)

    const printOptions = {
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

// Создание PDF-файла с изображением с учётом нового параметра PDForientation
async function createPdf(tempImagePath, tempPdfPath, isLandscape) {
  console.log("Добавление логотипа в PDF...")
  return new Promise((resolve, reject) => {
    try {
      // Размеры A6
      const PaperSizeX = Number(config.PaperSizeX)
      const PaperSizeY = Number(config.PaperSizeY)
      const A6 = [PaperSizeX, PaperSizeY]
      const A6Landscape = [PaperSizeY, PaperSizeX]

      //const A6 = [1212, 1842];
      //const A6Landscape = [1842, 1212];

      // Новый параметр из конфига для ориентации PDF
      // Ожидается значение "horizon" или "vertical"
      const pdfOrientation =
        config.PDForientation === "horizon" ? "horizon" : "vertical"
      // Выбираем размер страницы согласно параметру PDForientation
      const pageSize = pdfOrientation === "horizon" ? A6Landscape : A6

      // Создаем документ PDF с выбранным размером страницы
      const doc = new PDFDocument({
        size: pageSize,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      })

      // Поток записи PDF-файла
      const writeStream = fs.createWriteStream(tempPdfPath)
      doc.pipe(writeStream)

      console.log("Чтение файла изображения...")
      const extension = path.extname(tempImagePath).toLowerCase()
      if (
        extension !== ".jpg" &&
        extension !== ".jpeg" &&
        extension !== ".png"
      ) {
        throw new Error(`Неподдерживаемый формат изображения: ${extension}`)
      }

      // Определяем, нужно ли повернуть изображение.
      // Если ориентация PDF (pdfOrientation) не совпадает с ориентацией фото (isLandscape), то требуется поворот на 90 градусов.
      const rotateImage =
        (pdfOrientation === "horizon" && !isLandscape) ||
        (pdfOrientation === "vertical" && isLandscape)

      if (!borderPrintImage) {
        if (rotateImage) {
          // Для поворота: исходные размеры страницы
          const pageW = pageSize[0],
            pageH = pageSize[1]
          // Эффективная область для отрисовки после поворота: targetW = pageH, targetH = pageW
          const targetW = pageH,
            targetH = pageW
          // Центр оригинальной страницы
          const centerX = pageW / 2,
            centerY = pageH / 2

          // Открываем изображение
          const img = doc.openImage(tempImagePath)
          const imgW = img.width,
            imgH = img.height
          let drawWidth, drawHeight
          const imgRatio = imgW / imgH
          const targetRatio = targetW / targetH
          if (imgRatio > targetRatio) {
            drawHeight = targetH
            drawWidth = imgRatio * drawHeight
          } else {
            drawWidth = targetW
            drawHeight = drawWidth / imgRatio
          }
          // Вычисляем координаты, чтобы изображение было отцентрировано относительно target-области
          const drawX = centerX - drawWidth / 2
          const drawY = centerY - drawHeight / 2

          // Применяем трансформацию: перемещаемся в центр, поворачиваем, возвращаемся, устанавливаем клиппинг для target-области
          doc.save()
          doc.translate(centerX, centerY)
          doc.rotate(90)
          doc.translate(-centerX, -centerY)
          // Клиппим область отрисовки: отцентрированный прямоугольник с размерами targetW x targetH
          doc
            .rect(
              centerX - targetW / 2,
              centerY - targetH / 2,
              targetW,
              targetH
            )
            .clip()
          // Отрисовываем изображение так, чтобы его центр совпадал с центром страницы
          doc.image(tempImagePath, drawX, drawY, {
            width: drawWidth,
            height: drawHeight,
          })
          doc.restore()
        } else {
          // Режим "cover" без поворота
          const img = doc.openImage(tempImagePath)
          const imgW = img.width,
            imgH = img.height
          const pageW = pageSize[0],
            pageH = pageSize[1]
          let drawWidth, drawHeight, offsetX, offsetY
          const pageRatio = pageW / pageH
          const imgRatio = imgW / imgH
          if (imgRatio > pageRatio) {
            drawHeight = pageH
            drawWidth = imgRatio * drawHeight
            offsetX = -(drawWidth - pageW) / 2
            offsetY = 0
          } else {
            drawWidth = pageW
            drawHeight = drawWidth / imgRatio
            offsetX = 0
            offsetY = -(drawHeight - pageH) / 2
          }
          doc.save()
          doc.rect(0, 0, pageW, pageH).clip()
          doc.image(tempImagePath, offsetX, offsetY, {
            width: drawWidth,
            height: drawHeight,
          })
          doc.restore()
        }
      } else {
        // Если включена опция обрезки границ (borderPrintImage true) — оставляем прежнюю логику с fit
        if (rotateImage) {
          const pageW = pageSize[0],
            pageH = pageSize[1]
          const centerX = pageW / 2,
            centerY = pageH / 2
          doc.rotate(90, { origin: [centerX, centerY] })
          doc.image(tempImagePath, 0, -pageW, {
            fit: [pageH, pageW],
            align: "center",
            valign: "center",
          })
          doc.rotate(-90, { origin: [centerX, centerY] })
        } else {
          doc.image(tempImagePath, 0, 0, {
            fit: pageSize,
            align: "center",
            valign: "center",
          })
        }
      }

      console.log("Завершаю создание PDF...")
      doc.end()

      writeStream.on("finish", () => {
        console.log(`PDF успешно создан: ${tempPdfPath}`)
        resolve(tempPdfPath)
      })

      writeStream.on("error", (err) => {
        console.error("Ошибка при записи PDF:", err)
        reject(err)
      })
    } catch (error) {
      console.error("Не удалось создать PDF:", error)
      reject(error)
    }
  })
}

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
      if (isRunning && cameraCheckInterval) {
        clearInterval(cameraCheckInterval)
        console.log(
          "CameraControl.exe обнаружен; дальнейшие проверки остановлены."
        )
      }
    }
  )
}

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

app.on("error", (error) => {
  console.error("Ошибка приложения:", error)
})

process.on("uncaughtException", (error) => {
  console.error("Неперехваченное исключение:", error)
})

process.on("unhandledRejection", (error) => {
  console.error("Необработанное отклонение:", error)
})

// TEST: Функция для мониторинга ЦП и GPU
function monitorSystemLoad() {
  setInterval(async () => {
    try {
      const cpuLoad = await si.currentLoad()
      console.log(`Загрузка CPU: ${cpuLoad.currentLoad.toFixed(2)}%`)
    } catch (error) {
      console.error("Ошибка при получении загрузки CPU:", error)
    }
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
  }, 5000)
}

// Handler to retrieve the selected folder
ipcMain.on('get-selected-folder', (event) => {
  event.returnValue = global.selectedFolderPath;
});

// Handler to switch from photobooth to configurator
ipcMain.on('switch-to-configurator', (event, folderPath) => {
  // Close mainWindow if it's open
  if (mainWindow) {
    mainWindow.close();
    mainWindow = null;
  }
  
  // Create or show emptyWindow
  if (emptyWindow === null) {
    createEmptyWindow();
  } else {
    emptyWindow.show();
  }
});

// Handler to switch from configurator to photobooth
ipcMain.on('switch-to-photobooth', (event, folderPath) => {
  // Close emptyWindow if it's open
  if (emptyWindow) {
    emptyWindow.close();
    emptyWindow = null;
  }
  
  // Create or show mainWindow
  if (mainWindow === null) {
    createMainWindow();
  }
  mainWindow.show();
});
