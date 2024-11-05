const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { PDFDocument } = require('pdf-lib');
const { print } = require('pdf-to-printer');
const iconv = require('iconv-lite'); // Импортируем iconv-lite для обработки кодировки

// Загружаем конфигурацию после импорта необходимых модулей
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

function createWindow() {
    const win = new BrowserWindow({
        width: 1024,
        height: 768,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        autoHideMenuBar: true,
    });

    win.setMenuBarVisibility(false);
    win.loadFile('index.html');
}

// Обработчик для получения списка стилей из папки styles
ipcMain.handle('get-styles', async () => {
    const stylesDir = config.stylesDir;
    console.log(`Loading styles from directory: ${stylesDir}`);

    try {
        if (!fs.existsSync(stylesDir)) {
            console.error('Styles directory does not exist:', stylesDir);
            return [];
        }

        const files = fs.readdirSync(stylesDir, { encoding: 'utf8' });
        const imageFiles = files.filter(file => /\.(jpg|jpeg|png)$/i.test(file));
        const styles = imageFiles.map(file => {
            const match = file.match(/^(.+?)(\((.+?)\))?\.jpg$/i);
            return match
                ? { originalName: match[1].trim(), displayName: match[3] ? match[3].trim() : match[1].trim() }
                : { originalName: path.parse(file).name, displayName: path.parse(file).name };
        });

        return styles;
    } catch (error) {
        console.error('Error reading styles directory:', error);
        return [];
    }
});

ipcMain.on('print-photo', async (event, data) => {
    if (!data || !data.imageData) {
        console.error('Error: imageData not provided or invalid.');
        return;
    }

    const { imageData, isLandscape, logoPosition = 'bottom-right', offset = 30 } = data;
    console.log('print-photo event received in main.js');
    console.log(`Image orientation: ${isLandscape ? 'landscape' : 'portrait'}`);

    try {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'print-'));
        const imageFileName = 'image.jpg';
        const pdfFileName = 'print.pdf';
        const tempImagePath = path.join(tempDir, imageFileName);
        const tempPdfPath = path.join(tempDir, pdfFileName);
        const logoPath = config.logoPath;  // Загружаем путь к логотипу из конфигурации

        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(tempImagePath, buffer);
        console.log(`Image saved: ${tempImagePath}`);

        if (!fs.existsSync(logoPath)) {
            console.warn('Logo file not found at path:', logoPath);
        }

        await addLogoToPdf(tempImagePath, tempPdfPath, logoPath, logoPosition, offset);
        await print(tempPdfPath);
        console.log('Print job started.');

        fs.unlinkSync(tempPdfPath);
        fs.unlinkSync(tempImagePath);
        fs.rmdirSync(tempDir);
        console.log('Temporary files deleted.');
    } catch (error) {
        console.error('Error during printing process:', error);
    }
});

async function addLogoToPdf(tempImagePath, tempPdfPath) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();

    const imageBytes = fs.readFileSync(tempImagePath);
    const jpgImage = await pdfDoc.embedJpg(imageBytes);
    const { width, height } = jpgImage.scale(1);
    page.setSize(width, height);
    page.drawImage(jpgImage, {
        x: 0,
        y: 0,
        width: width,
        height: height,
    });

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(tempPdfPath, pdfBytes);
    console.log(`PDF file saved: ${tempPdfPath}`);
}



app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    app.quit();
});
