const { loadConfig } = require("./configLoader")
let config = loadConfig()

function createDateFolders() {
  try {
    const dateFolder = path.join(
      baseDir,
      new Date().toISOString().slice(0, 10).replace(/-/g, "_")
    )
    const inputDir = path.join(dateFolder, "input")
    const outputDir = path.join(dateFolder, "output")
    ;[baseDir, dateFolder, inputDir, outputDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    })
    return { inputDir, outputDir }
  } catch (error) {
    console.error("Error in createDateFolders:", error)
    throw error
  }
}

function generateFileName() {
  try {
    const date = new Date()
    const timeString = `${date.getHours()}_${date.getMinutes()}_${date.getSeconds()}`
    const randomString = Math.random().toString(36).substring(2, 6)
    return `${timeString}_${randomString}.jpg`
  } catch (error) {
    console.error("Error in generateFileName:", error)
    throw error
  }
}

async function saveImageWithUtils(folderType, urlImage) {
  try {
    const { inputDir, outputDir } = createDateFolders()
    const folderPath = folderType === "input" ? inputDir : outputDir
    const fileName = generateFileName()
    const filePath = path.join(folderPath, fileName)
    let fileBuffer

    // Если тип "input" или urlImage не является валидным HTTP/HTTPS URL, обрабатываем как base64
    if (folderType === "input" || !/^https?:\/\//.test(urlImage)) {
      const imageData = urlImage.replace(/^data:image\/\w+;base64,/, "")
      fileBuffer = Buffer.from(imageData, "base64")
      // console.log(`▶️ Изображение обработано как base64 (${folderType})`)
    } else {
      // Обработка изображения по URL
      const response = await fetch(urlImage)
      if (!response.ok) {
        throw new Error(
          `Не удалось загрузить изображение: ${response.statusText}`
        )
      }
      const buffer = await response.arrayBuffer()
      fileBuffer = Buffer.from(buffer)
    }

    // Если требуется копирование в HotFolder
    if (folderType === "copyDirectory") {
      const hotPath =
        config?.HotFolderPath || "C:\\DNP\\Hot Folder\\Prints\\4x6"
      if (!fs.existsSync(hotPath)) {
        fs.mkdirSync(hotPath, { recursive: true })
        console.log("Папка для копирования создана.")
      }
      const hotFilePath = path.join(hotPath, fileName)
      if (hotFilePath) {
        fs.writeFileSync(hotFilePath, fileBuffer)
        console.log("▶️ Изображение скопировано:", hotFilePath)
      } else {
        console.error("Папки для копирования не существует!")
      }
    } else {
      // Сохраняем изображение в папку
      fs.writeFileSync(filePath, fileBuffer)
      console.log(`▶️ Изображение сохранено (${folderType}):`, filePath)
    }
  } catch (error) {
    console.error(`Ошибка в saveImage (${folderType}):`, error)
    throw error
  }
}

async function copyPhotoToDateFolder(imagesFolder, filepath) {
  try {
    // Берём имя файла из пути и создаём папку в случае отсут-я
    const filename = filepath.split("\\")[2]
    const filePath = path.join(imagesFolder, filename)
    const { inputDir } = createDateFolders()

    // console.log(`📂 Оригинальный файл: ${filePath}`);
    // console.log(`📁 Папка назначения: ${inputDir}`);

    // Проверяем, существует ли файл перед копированием
    try {
      await fs.promises.access(filePath)
    } catch (err) {
      console.error(`❌ Файл ${filePath} не найден!`)
      return null
    }

    // 🗂 Создаём папку, если её нет
    await fs.promises.mkdir(inputDir, { recursive: true })

    // 🏷 Генерируем новое имя файла
    const newFileName = generateFileName()
    const targetPath = path.join(inputDir, newFileName)

    // 🎯 Копируем фото с новым именем
    await fs.promises.copyFile(filePath, targetPath)
    console.log(`▶️ Изображение сохранено (input): ${targetPath}`)

    return targetPath // Возвращаем путь к новому файлу
  } catch (error) {
    console.error(`❌ Ошибка копирования фото: ${error.message}`)
    return null
  }
}

module.exports = { saveImageWithUtils, copyPhotoToDateFolder }
