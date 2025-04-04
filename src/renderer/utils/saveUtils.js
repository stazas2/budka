const fs = require("fs")
const path = require("path")
const { loadConfig } = require("./configLoader")

// Define baseDir (this was missing)
const baseDir = process.env.PHOTO_DIR || "C:\\temp\\photos"

// We'll now load the config with the correct event folder path when needed, not at module load time
let config = null

function getConfig() {
  // Try to get the current event folder from an environment variable or another source
  const eventFolderPath = process.env.EVENT_FOLDER_PATH || "c:\\temp\\UserFolder\\Events\\07.03.2025_ууу"
  
  // Load fresh config with the event folder path
  config = loadConfig(eventFolderPath)
  console.log("Config loaded with event path:", eventFolderPath)
  return config
}

// Initialize config
config = getConfig()

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
    // Refresh config to ensure we have the latest values
    config = getConfig()
       
    const { inputDir, outputDir } = createDateFolders()
    const folderPath = folderType === "input" ? inputDir : outputDir
    const fileName = generateFileName()
    const filePath = path.join(folderPath, fileName)
    let fileBuffer

    // Если тип "input" или urlImage не является валидным HTTP/HTTPS URL, обрабатываем как base64
    if (folderType === "input" || !/^https?:\/\//.test(urlImage)) {
      const imageData = urlImage.replace(/^data:image\/\w+;base64,/, "")
      buffer = Buffer.from(imageData, "base64") 

      fileBuffer = await sharp(buffer)
        .resize({ width: 1280, height: 720, fit: "inside" })
        .toFormat("jpeg", { quality: 80 })
        .toBuffer()
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
      // More detailed logging for debugging
      console.log("Hot folder enabled:", config?.hotFolder?.enabled)
      console.log("Hot folder path:", config?.hotFolder?.path)
      
      // Use default path as fallback if hotFolder config is missing
      let hotPath = "C:\\DNP\\Hot Folder\\Prints\\4x6"
      
      if (config?.hotFolder && typeof config.hotFolder === 'object') {
        hotPath = config.hotFolder.path || hotPath
      }
      
      if (!fs.existsSync(hotPath)) {
        fs.mkdirSync(hotPath, { recursive: true })
        console.log("Папка для копирования создана:", hotPath)
      }
      
      const hotFilePath = path.join(hotPath, fileName)
      fs.writeFileSync(hotFilePath, fileBuffer)
      console.log("▶️ Изображение скопировано:", hotFilePath)
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
