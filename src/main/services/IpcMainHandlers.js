const { ipcMain, dialog, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");
const { print, getPrinters } = require("pdf-to-printer");
const PDFDocument = require("pdfkit");
const os = require("os");

const ConfigurationService = require("./ConfigurationService");
const IpcChannels = require("../../shared/constants/IpcChannels");

async function createPdf(tempImagePath, tempPdfPath, isLandscape, config) {
    console.log("Creating PDF with image...");
    return new Promise((resolve, reject) => {
        try {
            const PaperSizeX = Number(config.paperSizeWidth) || 105; // mm
            const PaperSizeY = Number(config.paperSizeHeight) || 148; // mm
            const MM_TO_PT = 2.83465; // Convert mm to points (1pt = 1/72 inch, 1 inch = 25.4 mm)
            const A6WidthPt = PaperSizeX * MM_TO_PT;
            const A6HeightPt = PaperSizeY * MM_TO_PT;

            const A6 = [A6WidthPt, A6HeightPt];
            const A6Landscape = [A6HeightPt, A6WidthPt];

            const pdfOrientation = config.orientation === "landscape" ? "horizon" : "vertical";
            const pageSize = pdfOrientation === "horizon" ? A6Landscape : A6;

            const doc = new PDFDocument({
                size: pageSize,
                margins: { top: 0, bottom: 0, left: 0, right: 0 },
            });

            const writeStream = fs.createWriteStream(tempPdfPath);
            doc.pipe(writeStream);

            const extension = path.extname(tempImagePath).toLowerCase();
            if (extension !== ".jpg" && extension !== ".jpeg" && extension !== ".png") {
                throw new Error(`Unsupported image format: ${extension}`);
            }

            const rotateImage = (pdfOrientation === "horizon" && !isLandscape) ||
                              (pdfOrientation === "vertical" && isLandscape);

            const borderPrintImage = config.borderPrintImage === true;

            if (!borderPrintImage) {
                // "cover" logic
                const pageW = pageSize[0];
                const pageH = pageSize[1];
                let targetW = pageW, targetH = pageH;

                if (rotateImage) {
                    targetW = pageH;
                    targetH = pageW;
                }

                const img = doc.openImage(tempImagePath);
                const imgW = img.width;
                const imgH = img.height;
                let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

                const targetRatio = targetW / targetH;
                const imgRatio = imgW / imgH;

                if (imgRatio > targetRatio) {
                    drawHeight = targetH;
                    drawWidth = imgRatio * drawHeight;
                    offsetX = -(drawWidth - targetW) / 2;
                } else {
                    drawWidth = targetW;
                    drawHeight = drawWidth / imgRatio;
                    offsetY = -(drawHeight - targetH) / 2;
                }

                doc.save();
                doc.rect(0, 0, targetW, targetH).clip();

                if (rotateImage) {
                    const centerX = targetW / 2;
                    const centerY = targetH / 2;
                    doc.translate(centerX, centerY);
                    doc.rotate(90);
                    doc.translate(-centerX, -centerY);

                    if (imgRatio > targetRatio) {
                        offsetY = -(drawWidth - targetW) / 2;
                        offsetX = 0;
                    } else {
                        offsetX = -(drawHeight - targetH) / 2;
                        offsetY = 0;
                    }
                    doc.image(tempImagePath, offsetX, offsetY, { width: drawWidth, height: drawHeight });
                } else {
                    doc.image(tempImagePath, offsetX, offsetY, { width: drawWidth, height: drawHeight });
                }
                doc.restore();
            } else {
                // "fit" logic (legacy)
                if (rotateImage) {
                    const pageW = pageSize[0], pageH = pageSize[1];
                    const centerX = pageW / 2, centerY = pageH / 2;
                    doc.rotate(90, { origin: [centerX, centerY] });
                    doc.image(tempImagePath, 0, -pageW, { fit: [pageH, pageW], align: "center", valign: "center" });
                    doc.rotate(-90, { origin: [centerX, centerY] });
                } else {
                    doc.image(tempImagePath, 0, 0, { fit: pageSize, align: "center", valign: "center" });
                }
            }

            doc.end();

            writeStream.on("finish", () => {
                console.log(`PDF created successfully: ${tempPdfPath}`);
                resolve(tempPdfPath);
            });

            writeStream.on("error", (err) => {
                console.error("Error writing PDF:", err);
                reject(err);
            });
        } catch (error) {
            console.error("Failed to create PDF:", error);
            reject(error);
        }
    });
}

function initializeIpcHandlers() {
    console.log("[IPC] Initializing Main Handlers...");

    ipcMain.handle(IpcChannels.GET_CURRENT_CONFIG, () => {
        return ConfigurationService.getCurrentConfig();
    });

    ipcMain.on(IpcChannels.GET_SELECTED_FOLDER, (event) => {
        event.returnValue = global.selectedFolderPath || null;
    });

    ipcMain.on(IpcChannels.SELECTED_FOLDER, (event, folderPath) => {
        if (global.setSelectedFolder) {
            global.setSelectedFolder(folderPath);
        } else {
            console.error("[IPC] global.setSelectedFolder is not defined in main.js!");
        }
    });

    ipcMain.on(IpcChannels.SELECT_FILE, (event, options) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        const result = dialog.showOpenDialogSync(window, options);
        event.returnValue = {
            canceled: !result,
            filePaths: result || []
        };
    });

    ipcMain.handle(IpcChannels.GET_PRINTERS, async () => {
        try {
            const printers = await getPrinters();
            return printers;
        } catch (error) {
            console.error('[IPC] Error getting printers:', error);
            return [];
        }
    });

    ipcMain.on(IpcChannels.CONFIG_UPDATED, (event, folderPath) => {
        console.log(`[IPC] Received ${IpcChannels.CONFIG_UPDATED} for: ${folderPath}`);
        if (folderPath && folderPath === global.selectedFolderPath) {
            console.log(`[IPC] Reloading config for active folder: ${folderPath}`);
            const newConfig = ConfigurationService.loadConfigForEvent(folderPath);
            if (global.notifyWindowsOfConfigUpdate) {
                global.notifyWindowsOfConfigUpdate(newConfig);
            }
        } else {
            console.log(`[IPC] Config update for inactive folder (${folderPath}), ignoring reload.`);
        }
    });

    ipcMain.handle(IpcChannels.SAVE_EVENT_CONFIG, async (event, folderPath, configData) => {
        try {
            await ConfigurationService.saveEventConfig(folderPath, configData);
            return true;
        } catch (error) {
            console.error('[IPC] Error saving event config:', error);
            return false;
        }
    });

    ipcMain.on(IpcChannels.CAMERA_MODE_CHANGED, (event, cameraMode) => {
        console.log(`[IPC] Received ${IpcChannels.CAMERA_MODE_CHANGED}: ${cameraMode}`);
        ConfigurationService.currentConfig.cameraMode = cameraMode;
        if (global.handleCameraModeChange) {
            global.handleCameraModeChange(cameraMode);
        }
    });

    ipcMain.on(IpcChannels.PRINT_PHOTO, async (event, data) => {
        const config = ConfigurationService.getCurrentConfig();

        if (!data || !data.imageData) {
            console.error("[PrintService] Error: imageData not provided or invalid.");
            event.reply(IpcChannels.PRINT_PHOTO_RESPONSE, false);
            return;
        }

        const { imageData, isLandscape } = data;
        console.log(`[PrintService] Image orientation: ${isLandscape ? "landscape" : "portrait"}`);

        let tempDir = null;
        try {
            tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "print-"));
            const imageFileName = "image.jpg";
            const pdfFileName = "print.pdf";
            const tempImagePath = path.join(tempDir, imageFileName);
            const tempPdfPath = path.join(tempDir, pdfFileName);

            let buffer;
            if (imageData.startsWith('http')) {
                const response = await fetch(imageData);
                if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
                const arrayBuffer = await response.arrayBuffer();
                buffer = Buffer.from(arrayBuffer);
            } else if (imageData.startsWith('data:image')) {
                buffer = Buffer.from(imageData.split(",")[1], 'base64');
            } else {
                throw new Error("Unsupported image data format for printing.");
            }

            fs.writeFileSync(tempImagePath, buffer);
            console.log(`[PrintService] Image saved: ${tempImagePath}`);

            const generatedPdfPath = await createPdf(tempImagePath, tempPdfPath, isLandscape, config);
            console.log(`[PrintService] Generated PDF path: ${generatedPdfPath}`);

            const printOptions = {
                scale: "fit",
                silent: true
            };

            if (config.defaultPrinter) {
                console.log(`[PrintService] Using specified printer: ${config.defaultPrinter}`);
                printOptions.printer = config.defaultPrinter;
            }

            await print(generatedPdfPath, printOptions);
            console.log("[PrintService] Print initiated.");
            event.reply(IpcChannels.PRINT_PHOTO_RESPONSE, true);

        } catch (error) {
            console.error("[PrintService] Error during printing:", error);
            event.reply(IpcChannels.PRINT_PHOTO_RESPONSE, false);
        } finally {
            if (tempDir && fs.existsSync(tempDir)) {
                try {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                    console.log("[PrintService] Temporary files cleaned up.");
                } catch (cleanupError) {
                    console.error("[PrintService] Error cleaning up temporary files:", cleanupError);
                }
            }
        }
    });

    console.log("[IPC] Main Handlers Initialized.");
}

module.exports = { initializeIpcHandlers };