const path = require("path")
const fs = require("fs")
const os = require("os")
const PDFDocument = require("pdfkit")
const { print, getDefaultPrinter } = require("pdf-to-printer")
const { loadConfig } = require("../utils/configLoader")

const config = loadConfig()
const borderPrintImage = config.borderPrintImage

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

async function printPhoto(data) {
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
}

module.exports = {
  printPhoto,
  getDefaultPrinter
}
