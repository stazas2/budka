// main.js
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const PDFDocument = require("pdfkit");
const { print } = require("pdf-to-printer");
const { loadConfig } = require("./utils/configLoader");

const config = loadConfig();
let mainWindow;

function createWindow() {
  console.log("Creating main window...");
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 1440,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true
  });
  mainWindow.loadFile("index.html");
  mainWindow.on("error", (error) => {
    console.error("Window error:", error);
  });
}

app.whenReady().then(() => {
  // Если используется Canon, можно запускать bat-файл
  if (config.cameraMode === "canon") {
    const { exec } = require("child_process");
    exec("start.bat", { cwd: path.join(__dirname, "canon") }, (error, stdout, stderr) => {
      if (error) {
        console.error("Could not start Canon camera:", error);
        return;
      }
      console.log(stdout || stderr);
    });
  }
  createWindow();
});

ipcMain.handle("get-styles", async (event, genders) => {
  // Пример чтения стилей из папок для указанных полов – адаптируйте под свою логику
  const stylesDir = config.stylesDir.replace("{{basePath}}", config.basePath);
  if (!genders || genders.length === 0) {
    return [];
  }
  const styles = new Set();
  for (const gender of genders) {
    const genderDir = path.join(stylesDir, gender);
    if (!fs.existsSync(genderDir)) continue;
    const folders = fs.readdirSync(genderDir).filter(folder => fs.statSync(path.join(genderDir, folder)).isDirectory());
    for (const folder of folders) {
      const folderPath = path.join(genderDir, folder);
      const files = fs.readdirSync(folderPath);
      const imageFiles = files.filter(file => /\.(jpg|jpeg|png)$/i.test(file) && !file.startsWith(`1${folder}`));
      if (imageFiles.length > 0) {
        styles.add({ originalName: folder, displayName: folder });
      }
    }
  }
  return Array.from(styles);
});

ipcMain.on("print-photo", async (event, data) => {
  // Обработчик печати изображения – адаптируйте под свои нужды
  if (!data || !data.imageData) {
    console.error("Error: imageData not provided or invalid.");
    return;
  }
  try {
    // Пример создания PDF и вызова печати
    const tempPdfPath = path.join(os.tmpdir(), `print_${Date.now()}.pdf`);
    const doc = new PDFDocument({ size: "A6", margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    const writeStream = fs.createWriteStream(tempPdfPath);
    doc.pipe(writeStream);
    doc.image(data.imageData, 0, 0, { fit: [doc.page.width, doc.page.height] });
    doc.end();
    writeStream.on("finish", async () => {
      await print(tempPdfPath, { silent: true });
      event.sender.send("print-photo-response", true);
      fs.unlinkSync(tempPdfPath);
    });
    writeStream.on("error", (err) => {
      console.error("Error writing PDF:", err);
      event.sender.send("print-photo-response", false);
    });
  } catch (error) {
    console.error("Error during printing process:", error);
  }
});

app.on("window-all-closed", () => {
  app.quit();
});
