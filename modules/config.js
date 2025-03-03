const fs = require("fs")
const path = require("path")
const os = require("os")

// Base paths
const basePath = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : '/var/local');
const basePathName = path.basename(basePath);
const baseDir = path.join(__dirname, '..');
const stylesDir = path.join(baseDir, 'styles');
const imagesFolder = `./canon/SavedPhotos/`
const canonPhotosPath = path.join(baseDir, 'canon', 'ArchivePhotos');

// Server configuration
const localhost = 'http://localhost:5000';

// Hot folder configuration
const hotHolder = path.join(baseDir, 'hotfolder');

// Other static configuration
const printLogo = true;
const logo_scale = 0.4;
const logo_pos_x = 1000;
const logo_pos_y = 300;

// Load local configuration from config.json if present
const configFile = path.join(baseDir, 'config.json');
let config = {};

try {
  // Check if config file exists
  if (fs.existsSync(configFile)) {
    console.log(`Loading configuration from ${configFile}`);
    const configRaw = fs.readFileSync(configFile, 'utf8');
    config = JSON.parse(configRaw);
  }
} catch (error) {
  console.error(`Error loading configuration: ${error.message}`);
}

// Export everything
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
};
