// ipcHandlers.js
const { ipcMain } = require("electron")
const fs = require("fs")
const path = require("path")
const os = require("os")
const { print } = require("pdf-to-printer")
const { loadConfig } = require("./utils/configLoader")
const { createPdf } = require("./pdfGenerator")

function setupIpcHandlers() {
  const config = loadConfig()
  const stylesDir = config.stylesDir.replace("{{basePath}}", config.basePath)

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

      await print(generatedPdfPath, printOptions)
      console.log("Печать началась.")

      fs.unlinkSync(tempPdfPath)
      fs.unlinkSync(tempImagePath)
      fs.rmdirSync(tempDir)
      console.log("Временные файлы удалены.")
    } catch (error) {
      console.error("Ошибка в процессе печати:", error)
    }
  })
}

module.exports = { setupIpcHandlers }