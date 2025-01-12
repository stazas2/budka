const { app, BrowserWindow, ipcMain } = require("electron")
const path = require("path")
const fs = require("fs")
const os = require("os")
const PDFDocument = require("pdfkit")
const { print, getDefaultPrinter } = require("pdf-to-printer")
const { loadConfig } = require("./utils/configLoader")
const si = require("systeminformation")
const { exec } = require("child_process")

// Загружаем конфигурацию после импорта необходимых модулей
const config = loadConfig()
const basePath = config.basePath
const stylesDir = config.stylesDir.replace("{{basePath}}", basePath)
const borderPrintImage = config.borderPrintImage

/** Начало измерения времени запуска main процесса */
const mainStartupTimeStart = Date.now()

// Функция создания окна приложения
function createWindow() {
  console.log("Creating main window...")
  try {
    getDefaultPrinter().then(console.log);

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
    // Получение списка принтеров
    // console.log(win.webContents.getPrinters());

    win.on("error", (error) => {
      console.error("Window error:", error)
    })
  } catch (error) {
    console.error("Failed to create window:", error)
    app.quit()
  }
}

// Обработчик запроса стилей
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
          (file) =>
            /\.(jpg|jpeg|png)$/i.test(file) && !file.startsWith(`1${folder}`)
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

// Обработчик печати фотографии
ipcMain.on("print-photo", async (event, data) => {
  if (!data || !data.imageData) {
    console.error("Error: imageData not provided or invalid.");
    return;
  }

  const { imageData, isLandscape } = data;
  console.log(`Image orientation: ${isLandscape ? "landscape" : "portrait"}`);

  try {
    let orientation = ""
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "print-"));
    const imageFileName = "image.jpg";
    const pdfFileName = "print.pdf";
    const tempImagePath = path.join(tempDir, imageFileName);
    const tempPdfPath = path.join(tempDir, pdfFileName);

    const response = await fetch(imageData);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    fs.writeFileSync(tempImagePath, buffer);
    console.log(`Image saved: ${tempImagePath}`);

    // Генерация PDF
    const generatedPdfPath = await createPdf(tempImagePath, tempPdfPath, isLandscape);
    console.log(`Generated PDF path: ${generatedPdfPath}`);
    
    if (config.orientation === "landscape") {
      orientation = "landscape";
    } else if (config.orientation === "portrait" || config.orientation.trim() === "") {
      orientation = "portrait";
    }

    const printOptions = {
      paperSize: "A6",
      orientation,
      scale: 'fit',
      silent: false,
    };

    // Печать PDF
    await print(generatedPdfPath, printOptions);
    console.log("Print job started.");

    // Удаление временных файлов
    fs.unlinkSync(tempPdfPath);
    fs.unlinkSync(tempImagePath);
    fs.rmdirSync(tempDir);
    console.log("Temporary files deleted.");
  } catch (error) {
    console.error("Error during printing process:", error);
  }
});


// Создание PDF-файла с изображением
async function createPdf(tempImagePath, tempPdfPath, isLandscape) {
  console.log("Adding logo to PDF...");
  return new Promise((resolve, reject) => {
    try {
      const A6 = [297.64, 419.53]; // Размеры A6 в точках
      const A6Landscape = [419.53, 297.64]; // Размеры A6 в точках (альбомная ориентация)

      // Создаем новый документ PDF
      const doc = new PDFDocument({
        size: isLandscape ? A6Landscape : A6,
        margins: { top: 0, bottom: 0, left: 0, right: 0 }, // Убираем отступы
      });

      // Поток записи PDF-файла
      const writeStream = fs.createWriteStream(tempPdfPath);
      doc.pipe(writeStream);

      console.log("Reading image file...");
      const extension = path.extname(tempImagePath).toLowerCase();

      // Проверяем поддерживаемые форматы изображений
      if (extension !== ".jpg" && extension !== ".jpeg" && extension !== ".png") {
        throw new Error(`Unsupported image format: ${extension}`);
      }

      //todo
      //? если рамки не нужны по дефолту, то убрать точные размеры и оставить масштабирование (fit)
      if (!borderPrintImage) {
        [width, height] = [
          ...doc.image(tempImagePath, 0, 0, {
            width: isLandscape ? A6Landscape[0] : A6[0], // Полная ширина страницы
            height: isLandscape ? A6[0] : A6Landscape[0], // Полная высота страницы
          }).options.size,
        ]
      } else {
        [width, height] = [
          ...doc
            .image(tempImagePath, 0, 0, {
              fit: isLandscape ? A6Landscape : A6,
              align: "center",
              valign: "center",
            })
            .scale(1).options.size,
        ]
      }
  
      console.log(`Image dimensions: ${width} x ${height}`)

      console.log("Finishing PDF...");
      doc.end();

      // Завершаем выполнение при завершении потока
      writeStream.on("finish", () => {
        console.log(`PDF created successfully: ${tempPdfPath}`);
        resolve(tempPdfPath); // Возвращаем путь к файлу
      });

      writeStream.on("error", (err) => {
        console.error("Error writing PDF:", err);
        reject(err); // Отклоняем Promise при ошибке
      });
    } catch (error) {
      console.error("Failed to create PDF:", error);
      reject(error);
    }
  });
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
