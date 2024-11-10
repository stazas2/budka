const { app, BrowserWindow, ipcMain, protocol } = require("electron")
const path = require("path")
const fs = require("fs")
const os = require("os")
const { PDFDocument } = require("pdf-lib")
const { print } = require("pdf-to-printer")
const iconv = require("iconv-lite") // Импортируем iconv-lite для обработки кодировки
const { loadConfig } = require("./utils/configLoader")

// Загружаем конфигурацию после импорта необходимых модулей
const config = loadConfig()

// const resolutions = [
//     { width: 1920, height: 1280 }, // Full HD
//     { width: 1080, height: 720 },  // HD
//     { width: 640, height: 480 }    // SD
//  ];
function createWindow() {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    autoHideMenuBar: true,
  })

  win.setMenuBarVisibility(false)
  win.loadFile("index.html")
}

// Регистрируем протокол для загрузки локальных ресурсов
// app.whenReady().then(() => {
//   protocol.registerFileProtocol('local', (request, callback) => {
//     const url = request.url.substr(8)    // Убираем 'local://' из начала URL
//     const resolvedPath = path.join(config.stylesDir, url)
//     callback({ path: path.normalize(resolvedPath) })
//   })

//   createWindow()
// })

// Обработчик для получения списка стилей из папки styles
ipcMain.handle("get-styles", async () => {
  const stylesDir = config?.stylesDir || "C:\\MosPhotoBooth2\\styles"
  console.log(`Loading styles from directory: ${stylesDir}`)

  try {
    if (!fs.existsSync(stylesDir)) {
      console.warn(`Creating styles directory: ${stylesDir}`)
      fs.mkdirSync(stylesDir, { recursive: true })
      return []
    }

    const styleFolders = fs.readdirSync(stylesDir, { encoding: "utf8" }).filter(folder => fs.statSync(path.join(stylesDir, folder)).isDirectory());
    const styles = [];

    for (const folder of styleFolders) {
      const folderPath = path.join(stylesDir, folder);
      const files = fs.readdirSync(folderPath, { encoding: "utf8" });
      // todo
      // Исключаем авы, начинающиеся на 1
      const imageFiles = files.filter((file) => /\.(jpg|jpeg|png)$/i.test(file) && !file.startsWith("1"));

      if (imageFiles.length > 0) {
        styles.push({
          originalName: folder,
          displayName: folder
        });
      }
    }

    if (styles.length === 0) {
      console.warn("No style images found in directory")
      return []
    }

    return styles;
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

async function addLogoToPdf(tempImagePath, tempPdfPath) {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage()

  const imageBytes = fs.readFileSync(tempImagePath)
  const jpgImage = await pdfDoc.embedJpg(imageBytes)
  const { width, height } = jpgImage.scale(1)
  page.setSize(width, height)
  page.drawImage(jpgImage, {
    x: 0,
    y: 0,
    width: width,
    height: height,
  })

  const pdfBytes = await pdfDoc.save()
  fs.writeFileSync(tempPdfPath, pdfBytes)
  console.log(`PDF file saved: ${tempPdfPath}`)
}

app.whenReady().then(createWindow)

app.on("window-all-closed", () => {
  app.quit()
})
