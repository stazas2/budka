// pdfGenerator.js
const PDFDocument = require("pdfkit")
const fs = require("fs")
const path = require("path")
const { loadConfig } = require("./utils/configLoader")

async function createPdf(tempImagePath, tempPdfPath, isLandscape) {
  console.log("Добавление логотипа в PDF...")
  return new Promise((resolve, reject) => {
    try {
      const config = loadConfig()
      const PaperSizeX = Number(config.PaperSizeX)
      const PaperSizeY = Number(config.PaperSizeY)
      const A6 = [PaperSizeX, PaperSizeY]
      const A6Landscape = [PaperSizeY, PaperSizeX]

      const pdfOrientation =
        config.PDForientation === "horizon" ? "horizon" : "vertical"
      const pageSize = pdfOrientation === "horizon" ? A6Landscape : A6

      const doc = new PDFDocument({
        size: pageSize,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      })

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

      const rotateImage =
        (pdfOrientation === "horizon" && !isLandscape) ||
        (pdfOrientation === "vertical" && isLandscape)

      if (!config.borderPrintImage) {
        if (rotateImage) {
          const pageW = pageSize[0],
            pageH = pageSize[1]
          const targetW = pageH,
            targetH = pageW
          const centerX = pageW / 2,
            centerY = pageH / 2

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
          const drawX = centerX - drawWidth / 2
          const drawY = centerY - drawHeight / 2

          doc.save()
          doc.translate(centerX, centerY)
          doc.rotate(90)
          doc.translate(-centerX, -centerY)
          doc
            .rect(centerX - targetW / 2, centerY - targetH / 2, targetW, targetH)
            .clip()
          doc.image(tempImagePath, drawX, drawY, {
            width: drawWidth,
            height: drawHeight,
          })
          doc.restore()
        } else {
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

module.exports = { createPdf }