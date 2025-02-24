// configLoader.js
const fs = require("fs")
const path = require("path")

function loadConfig() {
  const configPath = "C:\\MosPhotoBooth2\\config.json"

  try {
    console.log("Попытка загрузки конфигурации из:", configPath);
    if (!fs.existsSync(configPath)) {
      console.error("Файл config.json не найден по пути:", configPath);
      throw new Error("Файл конфигурации не существует");
    }
    const data = fs.readFileSync(configPath, "utf8")
    console.log("Файл config.json успешно прочитан");
    const config = JSON.parse(data)

    config.basePath = path.dirname(configPath)

    // Обновляем пути в Theme
    ;["lightTheme", "darkTheme"].forEach((theme) => {
      if (config[theme] && config[theme].backgroundImage) {
        let backgroundImagePath = path.join(config.basePath, config[theme].backgroundImage)
        backgroundImagePath = backgroundImagePath.replace(/\\/g, "/")
        config[theme].backgroundImage = backgroundImagePath
      }
    })

    // Логика для logoPath
    if (config.logoPath) {
      let logoPath = path.join(config.basePath, config.logoPath)
      logoPath = logoPath.replace(/\\/g, "/")
      config.logoPath = logoPath
    } else {
      console.warn("Путь к логотипу не задан в config.json, используется пустая строка");
      config.logoPath = "";
    }

    // Логика для brandLogoPath
    if (config.brandLogoPath) {
      let logoPath = path.join(config.basePath, config.brandLogoPath)
      logoPath = logoPath.replace(/\\/g, "/")
      config.brandLogoPath = logoPath
    }

    // Обработка HotFolder как boolean
    if (typeof config.HotFolder === "string") {
      config.HotFolder = config.HotFolder.toLowerCase() === "true";
    }

    console.log("Конфигурация загружена:", config);
    return config
  } catch (error) {
    console.error("Ошибка загрузки файла конфигурации:", error.message);
    return {} // Возвращаем пустой объект, чтобы избежать краха, но логируем ошибку
  }
}

module.exports = { loadConfig }