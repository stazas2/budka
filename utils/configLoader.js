const fs = require("fs")
const path = require("path")

// Modify the loadConfig function to handle basePath more carefully
function loadConfig(selectedFolderPath) {
  // Path to global config
  const globalConfigPath = "C:\\temp\\globalConfig.json";
  
  try {
    // Initialize with default empty config
    let config = {};
    
    // Try to load global config first
    try {
      const globalData = fs.readFileSync(globalConfigPath, "utf8");
      config = JSON.parse(globalData);
      console.log("Global config loaded from:", globalConfigPath);
    } catch (globalError) {
      console.error("Error loading global config:", globalError.message);
      // Continue with empty config if global config fails
    }
    
    // Set default paths - use the directory of globalConfig.json if it exists
    if (fs.existsSync(globalConfigPath)) {
      config.basePath = path.dirname(globalConfigPath);
    } else {
      config.basePath = process.cwd(); // Use current working directory as fallback
    }
    
    // If an event folder is selected, override basePath and load its config
    if (selectedFolderPath) {
      // CRITICAL: Always set basePath to the selected folder regardless of config existence
      config.basePath = selectedFolderPath;
      
      try {
        const eventConfigPath = path.join(selectedFolderPath, "config.json");
        if (fs.existsSync(eventConfigPath)) {
          const eventData = fs.readFileSync(eventConfigPath, "utf8");
          const eventConfig = JSON.parse(eventData);
          
          // Merge event config with global config (event config takes precedence)
          config = { ...config, ...eventConfig };
          console.log("Event config loaded and merged from:", eventConfigPath);
          
          // Ensure basePath is set to the selected folder, even if the config tried to override it
          config.basePath = selectedFolderPath;
          console.log(`Setting basePath to event folder: ${selectedFolderPath}`);
        } else {
          console.log(`No event config found at ${eventConfigPath}, using global config with selected folder as basePath`);
        }
      } catch (eventError) {
        console.error("Error loading event config:", eventError.message);
      }
    }

    // CRITICAL: Ensure stylesDir is properly set
    if (!config.stylesDir) {
      config.stylesDir = path.join(config.basePath, "styles");
      console.log(`Setting default stylesDir: ${config.stylesDir}`);
    }

    // Process string interpolation for all values containing {{basePath}}
    processConfigInterpolation(config, config.basePath);

    // Ensure camera_rotation is properly set
    config.camera_rotation = config.camera_rotation != null ? Number(config.camera_rotation) : 0;

    // Final check to ensure critical paths and settings are set
    console.log("Final config paths:");
    console.log("- basePath:", config.basePath);
    console.log("- stylesDir:", config.stylesDir);
    console.log("- camera_rotation:", config.camera_rotation);

    return config;
  } catch (error) {
    console.error("Error loading configuration file:", error);
    return {
      basePath: selectedFolderPath || process.cwd(),
      stylesDir: selectedFolderPath ? path.join(selectedFolderPath, "styles") : path.join(process.cwd(), "styles"),
      logoPath: "",
      brandLogoPath: "",
      camera_rotation: 0, // Provide a default value
    };
  }
}

// Improve the interpolation and path validation
function processConfigInterpolation(obj, basePath) {
  if (!obj || typeof obj !== 'object') return;
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // If it's a string containing {{basePath}}, replace it
      if (typeof obj[key] === 'string' && obj[key].includes('{{basePath}}')) {
        // Make sure basePath is defined before interpolation
        if (!basePath) {
          console.warn(`Warning: Attempting to interpolate {{basePath}} but basePath is empty for key: ${key}`);
          obj[key] = obj[key].replace('{{basePath}}', '.');
        } else {
          obj[key] = obj[key].replace(/{{basePath}}/g, basePath);
        }
        console.log(`Interpolated ${key}: ${obj[key]}`);
      } 
      // Handle special paths including stylesDir
      else if (key === 'stylesDir' && typeof obj[key] === 'string') {
        // When stylesDir is specified but doesn't have a substitution
        if (basePath && !obj[key].includes('{{basePath}}')) {
          if (path.isAbsolute(obj[key])) {
            obj[key] = obj[key].replace(/\\/g, "/");
          } else {
            // Join with base path if it's a relative path
            obj[key] = path.join(basePath, obj[key]).replace(/\\/g, "/");
          }
        }
        console.log(`Processed stylesDir: ${obj[key]}`);
      }
      // If the property is a path, make sure it's valid
      else if ((key === 'backgroundImage' || key === 'logoPath' || key === 'brandLogoPath') && typeof obj[key] === 'string') {
        if (obj[key] && !path.isAbsolute(obj[key]) && basePath) {
          obj[key] = path.join(basePath, obj[key]).replace(/\\/g, "/");
        }
        
        // Check if the file exists and log warning if not
        if (obj[key] && !fs.existsSync(obj[key])) {
          console.warn(`Warning: File not found at path ${obj[key]} for config property ${key}`);
        }
      }
      // If it's a nested object, recurse
      else if (typeof obj[key] === 'object' && obj[key] !== null) {
        processConfigInterpolation(obj[key], basePath);
      }
    }
  }
}

module.exports = { loadConfig }
