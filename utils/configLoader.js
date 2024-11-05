const fs = require('fs');
const path = require('path');

const defaultConfig = {
    stylesDir: path.join(__dirname, '..', 'styles'),
    logoPath: path.join(__dirname, '..', 'assets', 'logo.png'),
    prePhotoTimer: 5,
    camera_rotation: 0,
    final_image_rotation: 0,
    send_image_rotation: 0,
    logoPosition: 'bottom-right',
    logoOffsetX: 0,
    logoOffsetY: 0
};

function loadConfig() {
    try {
        const configPath = path.join(__dirname, '..', 'config.json');
        if (!fs.existsSync(configPath)) {
            console.warn('Config file not found, using defaults');
            return defaultConfig;
        }

        const rawData = fs.readFileSync(configPath, 'utf-8');
        const userConfig = JSON.parse(rawData);
        
        // Merge default config with user config
        const config = { ...defaultConfig, ...userConfig };
        
        // Ensure stylesDir exists
        if (!fs.existsSync(config.stylesDir)) {
            fs.mkdirSync(config.stylesDir, { recursive: true });
        }

        return config;
    } catch (error) {
        console.error('Failed to load config:', error);
        return defaultConfig;
    }
}

module.exports = { loadConfig, defaultConfig };
