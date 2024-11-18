const fs = require("fs")
const path = require("path")

function loadConfig() {
  const configPath = "C:\\MosPhotoBooth2\\config.json"
 
  try {
    const data = fs.readFileSync(configPath, "utf8")
    const config = JSON.parse(data)
    // Store the config file's directory path to use as a base path for relative paths
    config.basePath = path.dirname(configPath)
    return config
  } catch (error) {
    console.error("Error loading config file:", error)
    // Attempt to load config from root folder
    const fallbackConfigPath = path.join(__dirname, '..', 'config.json')
    try {
      const fallbackData = fs.readFileSync(fallbackConfigPath, "utf8")
      const config = JSON.parse(fallbackData)
      config.basePath = path.dirname(fallbackConfigPath)
      return config
    } catch (fallbackError) {
      console.error("Error loading fallback config file:", fallbackError)
      return {}
    }
  }
}

module.exports = { loadConfig }
