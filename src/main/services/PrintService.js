const PDFDocument = require('pdfkit');
const { print } = require('pdf-to-printer');
const fs = require('fs');
const path = require('path');
const os = require('os');

class PrintService {
    constructor() {
        this.tempDir = null;
    }

    async printPhoto(imageData, config, isLandscape = false) {
        if (!imageData) {
            throw new Error("No image data provided");
        }

        try {
            this.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'print-'));
            const imageFileName = "temp_print_image.jpg";
            const pdfFileName = "temp_print.pdf";
            const tempImagePath = path.join(this.tempDir, imageFileName);
            const tempPdfPath = path.join(this.tempDir, pdfFileName);

            // Save image data to temp file
            await this.saveImageToFile(imageData, tempImagePath);
            console.log("[PrintService] Image saved to temp file");

            // Create and save PDF
            await this.createPdf(tempImagePath, tempPdfPath, config, isLandscape);
            console.log("[PrintService] PDF created");

            // Print PDF
            await this.sendToPrinter(tempPdfPath, config);
            console.log("[PrintService] Print job sent");

            return true;
        } catch (error) {
            console.error("[PrintService] Error in print process:", error);
            throw error;
        } finally {
            this.cleanup();
        }
    }

    async saveImageToFile(imageData, tempImagePath) {
        let buffer;
        if (imageData.startsWith('http')) {
            const response = await fetch(imageData);
            if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
            const arrayBuffer = await response.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        } else if (imageData.startsWith('data:image')) {
            buffer = Buffer.from(imageData.split(",")[1], 'base64');
        } else {
            throw new Error("Unsupported image data format");
        }

        fs.writeFileSync(tempImagePath, buffer);
    }

    async createPdf(tempImagePath, tempPdfPath, config, isLandscape) {
        return new Promise((resolve, reject) => {
            try {
                const PaperSizeX = Number(config.paperSizeWidth) || 105; // mm
                const PaperSizeY = Number(config.paperSizeHeight) || 148; // mm
                const MM_TO_PT = 2.83465; // Convert mm to points
                const pageWidth = PaperSizeX * MM_TO_PT;
                const pageHeight = PaperSizeY * MM_TO_PT;

                const pageSize = [pageWidth, pageHeight];
                const pageSizeLandscape = [pageHeight, pageWidth];

                const pdfOrientation = config.orientation === "landscape" ? "landscape" : "portrait";
                const finalPageSize = pdfOrientation === "landscape" ? pageSizeLandscape : pageSize;

                const doc = new PDFDocument({
                    size: finalPageSize,
                    margins: { top: 0, bottom: 0, left: 0, right: 0 },
                });

                const writeStream = fs.createWriteStream(tempPdfPath);
                doc.pipe(writeStream);

                const img = doc.openImage(tempImagePath);
                const imgRatio = img.width / img.height;
                const pageRatio = finalPageSize[0] / finalPageSize[1];

                if (config.borderPrintImage) {
                    // Fit mode with borders
                    doc.image(tempImagePath, 0, 0, {
                        fit: finalPageSize,
                        align: 'center',
                        valign: 'center'
                    });
                } else {
                    // Cover mode without borders
                    let drawWidth, drawHeight;
                    if (imgRatio > pageRatio) {
                        drawHeight = finalPageSize[1];
                        drawWidth = drawHeight * imgRatio;
                    } else {
                        drawWidth = finalPageSize[0];
                        drawHeight = drawWidth / imgRatio;
                    }

                    const offsetX = (finalPageSize[0] - drawWidth) / 2;
                    const offsetY = (finalPageSize[1] - drawHeight) / 2;

                    doc.image(tempImagePath, offsetX, offsetY, {
                        width: drawWidth,
                        height: drawHeight
                    });
                }

                doc.end();

                writeStream.on('finish', () => resolve(tempPdfPath));
                writeStream.on('error', reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    async sendToPrinter(pdfPath, config) {
        const options = {
            printer: config.defaultPrinter || undefined,
            scale: "fit",
            silent: true
        };

        await print(pdfPath, options);
    }

    cleanup() {
        if (this.tempDir && fs.existsSync(this.tempDir)) {
            try {
                fs.rmSync(this.tempDir, { recursive: true, force: true });
                console.log("[PrintService] Temporary files cleaned up");
            } catch (error) {
                console.error("[PrintService] Error cleaning up temp files:", error);
            }
        }
    }
}

module.exports = new PrintService();