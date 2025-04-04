const fs = require("fs");
const path = require("path");

const GLOBAL_CONFIG_FILENAME = "config.json"; // Global config now in root
const EVENT_CONFIG_FILENAME = "config.json";

class ConfigurationService {
    constructor() {
        this.basePath = process.cwd(); // Default to current directory
        this.globalConfigPath = path.join(this.basePath, GLOBAL_CONFIG_FILENAME);
        this.currentConfig = this.loadInitialConfig();
        console.log("[ConfigService] Initialized.");
    }

    loadInitialConfig() {
        let config = { camera_rotation: 0 }; // Start with minimal defaults
        config.basePath = this.basePath; // Set initial basePath

        // Try loading global config
        try {
            if (fs.existsSync(this.globalConfigPath)) {
                const globalData = fs.readFileSync(this.globalConfigPath, "utf8");
                const parsedGlobal = JSON.parse(globalData);
                config = { ...config, ...parsedGlobal }; // Merge global over defaults
                config.basePath = this.basePath; // Ensure basePath isn't overridden by global file
                console.log(`[ConfigService] Global config loaded from: ${this.globalConfigPath}`);
            } else {
                console.warn(`[ConfigService] Global config not found at: ${this.globalConfigPath}. Using defaults.`);
                // Create a default global config if it doesn't exist? Optional.
                // fs.writeFileSync(this.globalConfigPath, JSON.stringify({ basePath: this.basePath, cameraMode: 'pc' }, null, 2), 'utf8');
            }
        } catch (error) {
            console.error(`[ConfigService] Error loading global config: ${error.message}`);
        }

        this.processConfigInterpolation(config, config.basePath);
        this.ensureConfigDefaults(config); // Apply defaults after loading global
        return config;
    }

    loadConfigForEvent(selectedFolderPath) {
        console.log(`[ConfigService] Loading config for event: ${selectedFolderPath}`);
        let eventConfig = {};
        let finalConfig = { ...this.currentConfig }; // Start with current (likely global)

        if (selectedFolderPath) {
            // CRITICAL: Always set basePath to the selected folder path
            finalConfig.basePath = selectedFolderPath;
            console.log(`[ConfigService] Setting basePath to event folder: ${selectedFolderPath}`);

            const eventConfigPath = path.join(selectedFolderPath, EVENT_CONFIG_FILENAME);
            try {
                if (fs.existsSync(eventConfigPath)) {
                    const eventData = fs.readFileSync(eventConfigPath, "utf8");
                    eventConfig = JSON.parse(eventData);
                    // Merge event config over the current config
                    finalConfig = { ...finalConfig, ...eventConfig };
                    // Ensure basePath remains the event folder path
                    finalConfig.basePath = selectedFolderPath;
                    console.log(`[ConfigService] Event config loaded and merged from: ${eventConfigPath}`);
                } else {
                    console.log(`[ConfigService] No event config found at ${eventConfigPath}. Using previously loaded config with updated basePath.`);
                }
            } catch (error) {
                console.error(`[ConfigService] Error loading event config: ${error.message}`);
                // Fallback to current config but ensure basePath is the event folder
                finalConfig.basePath = selectedFolderPath;
            }
        } else {
            console.log("[ConfigService] No event folder path provided, returning current config.");
            // If no event path, ensure we use the initial base path
            finalConfig.basePath = this.basePath;
        }

        this.processConfigInterpolation(finalConfig, finalConfig.basePath);
        this.ensureConfigDefaults(finalConfig);
        this.currentConfig = finalConfig; // Update the service's current config
        return this.currentConfig;
    }

    saveEventConfig(folderPath, dataToSave) {
        if (!folderPath) {
            console.error("[ConfigService] Cannot save event config without folderPath.");
            throw new Error("Event folder path is required.");
        }
        const eventConfigPath = path.join(folderPath, EVENT_CONFIG_FILENAME);
        try {
            let existingConfig = {};
            if (fs.existsSync(eventConfigPath)) {
                const eventData = fs.readFileSync(eventConfigPath, "utf8");
                existingConfig = JSON.parse(eventData);
            }
            // Merge new data over existing config
            const updatedConfig = { ...existingConfig, ...dataToSave };
            // Ensure basePath is NOT saved into the event config file itself
            delete updatedConfig.basePath;

            fs.writeFileSync(eventConfigPath, JSON.stringify(updatedConfig, null, 2), 'utf8');
            console.log(`[ConfigService] Event config saved successfully to: ${eventConfigPath}`);

            // If the saved folder is the currently active one, reload the config in memory
            if (global.selectedFolderPath === folderPath) {
                console.log("[ConfigService] Reloading current config after save.");
                this.loadConfigForEvent(folderPath);
            }
            return true;
        } catch (error) {
            console.error(`[ConfigService] Error saving event config to ${eventConfigPath}:`, error);
            throw error;
        }
    }

    saveGlobalConfig(dataToSave) {
        try {
            let existingGlobalConfig = {};
            if (fs.existsSync(this.globalConfigPath)) {
                const globalData = fs.readFileSync(this.globalConfigPath, "utf8");
                existingGlobalConfig = JSON.parse(globalData);
            }
            // Merge new data over existing global config
            const updatedGlobalConfig = { ...existingGlobalConfig, ...dataToSave };

            // Ensure basePath is NOT saved into the global config file
            delete updatedGlobalConfig.basePath;

            fs.writeFileSync(this.globalConfigPath, JSON.stringify(updatedGlobalConfig, null, 2), 'utf8');
            console.log(`[ConfigService] Global config saved successfully to: ${this.globalConfigPath}`);

            // Update the current config in memory partly
            this.currentConfig = { ...this.currentConfig, ...dataToSave };
            // Re-process interpolation and defaults if needed
            this.processConfigInterpolation(this.currentConfig, this.currentConfig.basePath);
            this.ensureConfigDefaults(this.currentConfig);

            return true;
        } catch (error) {
            console.error(`[ConfigService] Error saving global config to ${this.globalConfigPath}:`, error);
            throw error;
        }
    }

    getCurrentConfig() {
        // Return a copy to prevent direct modification
        return { ...this.currentConfig };
    }

    processConfigInterpolation(obj, basePathToUse) {
        if (!obj || typeof obj !== 'object') return;

        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];

                if (typeof value === 'string') {
                    if (value.includes('{{basePath}}')) {
                        if (!basePathToUse) {
                            console.warn(`[ConfigService] Warning: Attempting to interpolate {{basePath}} but basePath is empty for key: ${key}. Using '.'`);
                            obj[key] = value.replace(/{{basePath}}/g, '.');
                        } else {
                            // Ensure backslashes are normalized ONLY IF basePath contains them
                            const normalizedBasePath = basePathToUse.replace(/\\/g, '/');
                            obj[key] = value.replace(/{{basePath}}/g, normalizedBasePath).replace(/\\/g, '/');
                        }
                    } else if (['logoPath', 'brandLogoPath', 'backgroundImage'].includes(key) || key.endsWith('Path') || key.endsWith('Dir')) {
                        // Handle paths that might be relative *without* {{basePath}}
                        if (value && !path.isAbsolute(value) && basePathToUse) {
                            obj[key] = path.join(basePathToUse, value).replace(/\\/g, '/');
                        } else if(value) {
                            obj[key] = value.replace(/\\/g, '/'); // Normalize absolute paths
                        }
                    }
                } else if (typeof value === 'object' && value !== null) {
                    this.processConfigInterpolation(value, basePathToUse); // Recurse
                }
            }
        }
        // Ensure stylesDir is correctly derived if not explicitly set or interpolated
        if (!obj.stylesDir && basePathToUse) {
            obj.stylesDir = path.join(basePathToUse, "styles").replace(/\\/g, "/");
            console.log(`[ConfigService] Derived default stylesDir: ${obj.stylesDir}`);
        } else if (obj.stylesDir) {
            obj.stylesDir = obj.stylesDir.replace(/\\/g, "/"); // Normalize just in case
        }
    }

    ensureConfigDefaults(config) {
        config.PaperSizeX = Number(config.paperSizeWidth) || 105; // A6 default width in mm
        config.PaperSizeY = Number(config.paperSizeHeight) || 148; // A6 default height in mm
        config.PDForientation = config.orientation === 'landscape' ? 'horizon' : 'vertical';
        config.borderPrintImage = config.borderPrintImage === true;
        config.printButtonVisible = config.printButtonVisible !== false; // Default true
        config.defaultPrinter = config.defaultPrinter || "";

        config.prePhotoTimer = Number(config.prePhotoTimer) || 4;
        config.inactivityTimeout = Number(config.inactivityTimeout) || 60000;
        config.showStyleNames = config.showStyleNames !== false; // Default true
        config.visibilityAgree = config.visibilityAgree === true;

        config.camera_rotation = config.camera_rotation != null ? Number(config.camera_rotation) : 0;
        config.send_image_rotation = config.send_image_rotation != null ? Number(config.send_image_rotation) : 0;
        config.isEvf = config.isEvf === true;
        config.cameraMode = config.cameraMode || 'pc';

        config.mainLogoScale = Number(config.mainLogoScale) || 1;
        config.logoScale = Number(config.logoScale) || 1;
        config.logoOffsetX = Number(config.logoOffsetX) || 0;
        config.logoOffsetY = Number(config.logoOffsetY) || 0;
        config.theme = config.theme || "light";
        config.backdropBlur = config.backdropBlur || "0px";
        config.animationEnabled = config.animationEnabled !== false; // Default true

        config.language = config.language || { current: "ru", showSwitcher: false };
        config.language.current = config.language.current || "ru";
        config.language.showSwitcher = config.language.showSwitcher === true;

        config.allowMultipleGenderSelection = config.allowMultipleGenderSelection === true;
        if (!Array.isArray(config.allowedGenders) || config.allowedGenders.length === 0 || !config.allowedGenders.every(g => Array.isArray(g))) {
            console.warn("[ConfigService] Invalid allowedGenders structure found, resetting to default.");
            config.allowedGenders = [["man", "woman"], ["boy", "girl"], ["group"]];
        }

        config.lightTheme = config.lightTheme || {};
        config.lightTheme.backgroundColor = config.lightTheme.backgroundColor || '#ffebcd';
        config.lightTheme.backgroundImage = config.lightTheme.backgroundImage || '';
        config.lightTheme.lightTextColor = config.lightTheme.lightTextColor || '#000000';

        config.darkTheme = config.darkTheme || {};
        config.darkTheme.backgroundColor = config.darkTheme.backgroundColor || '#000000';
        config.darkTheme.backgroundImage = config.darkTheme.backgroundImage || '';
        config.darkTheme.darkTextColor = config.darkTheme.darkTextColor || '#ffffff';

        config.hotFolder = config.hotFolder || { enabled: false, path: '' };
        config.hotFolder.enabled = config.hotFolder.enabled === true;
        config.hotFolder.path = config.hotFolder.path || '';
    }
}

// Export a single instance (Singleton pattern)
module.exports = new ConfigurationService();