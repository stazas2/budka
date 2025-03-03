const fs = require('fs');
const path = require('path');

// Default configuration
const defaultConfig = {
  basePath: process.platform === 'win32' ? 'C:\\MosPhotoBooth2' : '/test/path',
  logoPath: '{{basePath}}\\logo.png',
  brandLogoPath: '',
  // Add any other default configuration values here
};

const CONFIG_PATH = path.join(__dirname, '../config.json');

/**
 * Loads application configuration from file
 * @returns {Object} The configuration object
 */
function loadConfig() {
  try {
    // Check if config file exists
    if (fs.existsSync(CONFIG_PATH)) {
      const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
      const parsedConfig = JSON.parse(configData);
      
      // Process path templates
      return processPathTemplates(parsedConfig);
    } else {
      console.log('Config file not found, creating default config');
      return createDefaultConfig();
    }
  } catch (error) {
    console.error('Error reading config file:', error);
    return createDefaultConfig();
  }
}

/**
 * Creates default configuration file
 * @returns {Object} Default configuration
 */
function createDefaultConfig() {
  try {
    const config = {...defaultConfig};
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    return processPathTemplates(config);
  } catch (error) {
    console.error('Error creating default config:', error);
    return processPathTemplates({...defaultConfig});
  }
}

/**
 * Processes path templates in configuration
 * @param {Object} config - Configuration object
 * @returns {Object} Processed configuration
 */
function processPathTemplates(config) {
  const processed = {...config};
  
  // Replace path templates for string properties
  for (const key in processed) {
    if (typeof processed[key] === 'string' && processed[key].includes('{{basePath}}')) {
      processed[key] = processed[key].replace('{{basePath}}', processed.basePath);
    }
  }
  
  return processed;
}

/**
 * Saves configuration to file
 * @param {Object} config - Configuration to save
 * @returns {boolean} Success status
 */
function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

module.exports = {
  loadConfig,
  saveConfig,
  defaultConfig,
  processPathTemplates
};
