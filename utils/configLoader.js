const fs = require("fs")
const path = require("path")

function loadConfig() {
  /** config.json: basePath */
  const configPath = "C:\\MosPhotoBooth2\\config.json"

  try {
    const data = fs.readFileSync(configPath, "utf8")
    const config = JSON.parse(data)

    config.basePath = path.dirname(configPath)

    // Обновляем пути в Theme
    if (config) {
      ;["lightTheme", "darkTheme"].forEach((theme) => {
        if (config[theme] && config[theme].backgroundImage) {
          let backgroundImagePath = path.join(
            config.basePath,
            config[theme].backgroundImage
          )
          backgroundImagePath = backgroundImagePath.replace(/\\/g, "/")
          // console.log(`Формированный путь (${theme}):`, backgroundImagePath)
          config[theme].backgroundImage = backgroundImagePath
        }
      })

      //Логика для лого на печати
      if (config.logoPath) {
        let logoPath = path.join(config.basePath, config.logoPath)
        logoPath = logoPath.replace(/\\/g, "/")
        // console.log(`Формированный путь (logo):`, logoPath)
        config.logoPath = logoPath
      } else {
        console.error("Logo path is not defined in config.json")
      }

      //Логика для лого на экране
      if (config.brandLogoPath) {
        let logoPath = path.join(config.basePath, config.brandLogoPath)
        logoPath = logoPath.replace(/\\/g, "/")
        // console.log(`Формированный путь (logo):`, logoPath)
        config.brandLogoPath = logoPath
      }
    } else {
      console.error("Config is undefined or null. Unable to process themes.")
    }

    return config
  } catch (error) {
      console.error("Error loading config file:", error)
      return {}

    // console.log("Loading EXTRA config file:", error)
    // const fallbackConfigPath = path.join(__dirname, "..", "config.json")
    // console.log("Fallback config path:", fallbackConfigPath)
    // try {
    //   const fallbackData = fs.readFileSync(fallbackConfigPath, "utf8")
    //   const config = JSON.parse(fallbackData)
    //   config.basePath = path.dirname(fallbackConfigPath)

    //   // Обновляем пути в Theme
    //   if (config) {
    //     ;["lightTheme", "darkTheme"].forEach((theme) => {
    //       if (config[theme] && config[theme].backgroundImage) {
    //         let backgroundImagePath = path.join(
    //           config.basePath,
    //           config[theme].backgroundImage
    //         )

    //         backgroundImagePath = backgroundImagePath.replace(/\\/g, "/")
    //         // console.log(`Формированный путь (${theme}):`, backgroundImagePath)
    //         config[theme].backgroundImage = backgroundImagePath
    //       }
    //     })
    //   } else {
    //     console.error("Config is undefined or null. Unable to process themes.")
    //   }

    //   return config
    // } catch (fallbackError) {
    //   console.error("Error loading fallback config file:", fallbackError)
    //   return {}
    // }
  }
}

module.exports = { loadConfig }

//// default
// const fs = require("fs")
// const path = require("path")

// function loadConfig() {
//   const configPath = "C:\\MosPhotoBooth3\\config.json"

//   try {
//     const data = fs.readFileSync(configPath, "utf8")
//     const config = JSON.parse(data)

//     config.basePath = path.dirname(configPath)
//     return config
//   } catch (error) {
//     console.error("Error loading config file:", error)

//     const fallbackConfigPath = path.join(__dirname, '..', 'config.json')
//     try {
//       const fallbackData = fs.readFileSync(fallbackConfigPath, "utf8")
//       const config = JSON.parse(fallbackData)
//       config.basePath = path.dirname(fallbackConfigPath)
//       return config
//     } catch (fallbackError) {
//       console.error("Error loading fallback config file:", fallbackError)
//       return {}
//     }
//   }
// }

// module.exports = { loadConfig }
