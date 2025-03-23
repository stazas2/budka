const fs = require("fs")
const path = require("path")

function loadConfig(selectedFolderPath) {
  // Path to global config
  const globalConfigPath = "C:\\temp\\globalConfig.json"
  
  try {
    // Initialize with default empty config
    let config = {}
    
    // Try to load global config first
    try {
      const globalData = fs.readFileSync(globalConfigPath, "utf8")
      config = JSON.parse(globalData)
      console.log("Global config loaded from:", globalConfigPath)
    } catch (globalError) {
      console.error("Error loading global config:", globalError.message)
      // Continue with empty config if global config fails
    }
    
    // Set default paths
    config.basePath = path.dirname(globalConfigPath)
    
    // If an event folder is selected, try to load and merge its config
    if (selectedFolderPath) {
      try {
        const eventConfigPath = path.join(selectedFolderPath, "config.json")
        if (fs.existsSync(eventConfigPath)) {
          const eventData = fs.readFileSync(eventConfigPath, "utf8")
          const eventConfig = JSON.parse(eventData)
          
          // Merge event config with global config (event config takes precedence)
          config = { ...config, ...eventConfig }
          console.log("Event config loaded and merged from:", eventConfigPath)
          
          // Override basePath with the event folder path
          config.basePath = selectedFolderPath
          console.log(`Setting basePath to event folder: ${selectedFolderPath}`)
        } else {
          console.log(`No event config found at ${eventConfigPath}, using global config only`)
          // Still use the event folder as basePath even without config
          config.basePath = selectedFolderPath
          console.log(`Setting basePath to event folder (no event config): ${selectedFolderPath}`)
        }
      } catch (eventError) {
        console.error("Error loading event config:", eventError.message)
        // Still set the basePath to the event folder even if loading fails
        config.basePath = selectedFolderPath
      }
    } else {
      console.log("No event folder selected, using global config only")
    }

    // Process string interpolation for all values containing {{basePath}}
    processConfigInterpolation(config, config.basePath);

    return config
  } catch (error) {
    console.error("Ошибка загрузки файла конфигурации:", error)
    return {}
  }
}

// Helper function to process string interpolation across the entire config object
function processConfigInterpolation(obj, basePath) {
  if (!obj || typeof obj !== 'object') return;
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // If it's a string containing {{basePath}}, replace it
      if (typeof obj[key] === 'string' && obj[key].includes('{{basePath}}')) {
        obj[key] = obj[key].replace(/{{basePath}}/g, basePath);
      } 
      // If the property is "backgroundImage" or "logoPath", process path joining
      else if ((key === 'backgroundImage' || key === 'logoPath' || key === 'brandLogoPath') && typeof obj[key] === 'string') {
        // Join paths and normalize
        let processedPath = path.join(basePath, obj[key]);
        obj[key] = processedPath.replace(/\\/g, "/");
      }
      // If it's a nested object, recurse
      else if (typeof obj[key] === 'object') {
        processConfigInterpolation(obj[key], basePath);
      }
    }
  }
}

module.exports = { loadConfig }
