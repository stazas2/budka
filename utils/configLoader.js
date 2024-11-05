const fs = require("fs")
const path = require("path")

function loadConfig() {
  const configPath = path.join(__dirname, "..", "config.json")
  try {
    const data = fs.readFileSync(configPath, "utf8")
    const config = JSON.parse(data)
    return config
  } catch (error) {
    console.error("Error loading config file:", error)
    return {}
  }
}

module.exports = { loadConfig }
