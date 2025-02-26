const fs = require("fs")
const path = require("path")
const { loadConfig } = require("../utils/configLoader")

// Load the configuration
const config = loadConfig()

// Path configurations
const basePath = config.basePath
const basePathName = path.basename(basePath)
const baseDir = path.join(basePath, "SavedPhotos")
const stylesDir = config.stylesDir.replace("{{basePath}}", basePath)
const localhost = "http://localhost:5000"
const imagesFolder = `./canon/SavedPhotos/`
const hotHolder = Boolean(config?.HotFolder)

// Determine canonical photos path based on environment
let canonPhotosPath
if (__dirname.includes("app.asar")) {
  // Logic for build
  let dir = __dirname
  while (path.basename(dir) !== "resources" && dir !== path.parse(dir).root) {
    dir = path.dirname(dir)
  }

  const resourcePath = path.dirname(dir)
  canonPhotosPath = path.join(resourcePath, "canon", "SavedPhotos")
} else {
  // Local run
  canonPhotosPath = path.join(path.dirname(__dirname), "canon", "SavedPhotos")
}

// Create folder if it doesn't exist
if (!fs.existsSync(canonPhotosPath)) {
  fs.mkdirSync(canonPhotosPath, { recursive: true })
  console.log(`Temporary location: \n${canonPhotosPath}`)
}

// Logo and style configurations
const printLogo = config?.logoPath
const logo_scale = config.logoScale
const logo_pos_x = config.logo_pos_x
const logo_pos_y = config.logo_pos_y

// Export configuration and paths
module.exports = {
  config,
  basePath,
  basePathName,
  baseDir,
  stylesDir,
  localhost,
  imagesFolder,
  hotHolder,
  canonPhotosPath,
  printLogo,
  logo_scale,
  logo_pos_x,
  logo_pos_y
}
