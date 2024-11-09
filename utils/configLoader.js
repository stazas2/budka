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
    return {}
  }
}

module.exports = { loadConfig }
