const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const IpcChannels = require('../../shared/constants/IpcChannels');

const GLOBAL_CONFIG_FILENAME = "config.json";
const EVENT_CONFIG_FILENAME = "config.json";

class ConfigurationService {
    constructor() {
        this.basePath = process.cwd();
        this.globalConfigPath = path.join(this.basePath, GLOBAL_CONFIG_FILENAME);
        this.currentConfig = this.loadInitialConfig();
        console.log("[ConfigService] Initialized");
    }

    loadInitialConfig() {
        let config = { camera_rotation: 0 };
        config.basePath = this.basePath;

        // Load global config if exists
        if (fs.existsSync(this.globalConfigPath)) {
            try {
                const globalData = fs.readFileSync(this.globalConfigPath, "utf8");
                const parsedGlobal = JSON.parse(globalData);
                config = { ...config, ...parsedGlobal };
                config.basePath = this.basePath; // Ensure basePath isn't overridden
                console.log(`[ConfigService] Global config loaded from ${this.globalConfigPath}`);
            } catch (error) {
                console.error(`[ConfigService] Error loading global config: ${error.message}`);
            }
        }

        this.processConfigInterpolation(config, config.basePath);
        this.ensureConfigDefaults(config);
        return config;
    }

    loadConfigForEvent(selectedFolderPath) {
        console.log(`[ConfigService] Loading config for event: ${selectedFolderPath}`);
        let finalConfig = { ...this.currentConfig };

        if (selectedFolderPath) {
            finalConfig.basePath = selectedFolderPath;
            const eventConfigPath = path.join(selectedFolderPath, EVENT_CONFIG_FILENAME);
            
            if (fs.existsSync(eventConfigPath)) {
                try {
                    const eventData = fs.readFileSync(eventConfigPath, "utf8");
                    const eventConfig = JSON.parse(eventData);
                    finalConfig = { ...finalConfig, ...eventConfig };
                    finalConfig.basePath = selectedFolderPath;
                    console.log(`[ConfigService] Event config loaded from ${eventConfigPath}`);
                } catch (error) {
                    console.error(`[ConfigService] Error loading event config: ${error.message}`);
                }
            }
        }

        this.processConfigInterpolation(finalConfig, finalConfig.basePath);
        this.ensureConfigDefaults(finalConfig);
        this.currentConfig = finalConfig;
        return this.currentConfig;
    }

    saveEventConfig(folderPath, dataToSave) {
        if (!folderPath) {
            throw new Error("Event folder path is required");
        }

        const eventConfigPath = path.join(folderPath, EVENT_CONFIG_FILENAME);
        try {
            let existingConfig = {};
            if (fs.existsSync(eventConfigPath)) {
                existingConfig = JSON.parse(fs.readFileSync(eventConfigPath, "utf8"));
            }

            const updatedConfig = { ...existingConfig, ...dataToSave };
            delete updatedConfig.basePath; // Never save basePath
            
            fs.writeFileSync(eventConfigPath, JSON.stringify(updatedConfig, null, 2));
            console.log(`[ConfigService] Saved event config to ${eventConfigPath}`);

            // Reload if this is the active folder
            if (global.appState.selectedFolderPath === folderPath) {
                this.loadConfigForEvent(folderPath);
            }
            return true;
        } catch (error) {
            console.error(`[ConfigService] Error saving event config: ${error.message}`);
            throw error;
        }
    }

    saveGlobalConfig(dataToSave) {
        try {
            let existingConfig = {};
            if (fs.existsSync(this.globalConfigPath)) {
                existingConfig = JSON.parse(fs.readFileSync(this.globalConfigPath, "utf8"));
            }

            const updatedConfig = { ...existingConfig, ...dataToSave };
            delete updatedConfig.basePath; // Never save basePath
            
            fs.writeFileSync(this.globalConfigPath, JSON.stringify(updatedConfig, null, 2));
            console.log(`[ConfigService] Saved global config to ${this.globalConfigPath}`);

            // Update current config
            this.currentConfig = { ...this.currentConfig, ...dataToSave };
            this.processConfigInterpolation(this.currentConfig, this.currentConfig.basePath);
            this.ensureConfigDefaults(this.currentConfig);
            return true;
        } catch (error) {
            console.error(`[ConfigService] Error saving global config: ${error.message}`);
            throw error;
        }
    }

    getCurrentConfig() {
        return { ...this.currentConfig };
    }

    processConfigInterpolation(obj, basePathToUse) {
        if (!obj || typeof obj !== 'object') return;

        for (const key in obj) {
            const value = obj[key];
            
            if (typeof value === 'string') {
                if (value.includes('{{basePath}}')) {
                    obj[key] = value.replace(/{{basePath}}/g, basePathToUse).replace(/\\/g, '/');
                } else if (['logoPath', 'brandLogoPath', 'backgroundImage'].includes(key) || 
                          key.endsWith('Path') || key.endsWith('Dir')) {
                    if (value && !path.isAbsolute(value) && basePathToUse) {
                        obj[key] = path.join(basePathToUse, value).replace(/\\/g, '/');
                    } else if (value) {
                        obj[key] = value.replace(/\\/g, '/');
                    }
                }
            } else if (typeof value === 'object' && value !== null) {
                this.processConfigInterpolation(value, basePathToUse);
            }
        }

        if (!obj.stylesDir && basePathToUse) {
            obj.stylesDir = path.join(basePathToUse, "styles").replace(/\\/g, "/");
        }
    }

    ensureConfigDefaults(config) {
        // Set all required default values
        config.PaperSizeX = Number(config.paperSizeWidth) || 105;
        config.PaperSizeY = Number(config.paperSizeHeight) || 148;
        config.PDForientation = config.orientation === 'landscape' ? 'horizon' : 'vertical';
        config.borderPrintImage = config.borderPrintImage === true;
        config.printButtonVisible = config.printButtonVisible !== false;
        config.defaultPrinter = config.defaultPrinter || "";
        
        config.prePhotoTimer = Number(config.prePhotoTimer) || 4;
        config.inactivityTimeout = Number(config.inactivityTimeout) || 60000;
        config.showStyleNames = config.showStyleNames !== false;
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
        config.animationEnabled = config.animationEnabled !== false;
        
        config.language = config.language || { current: "ru", showSwitcher: false };
        config.language.current = config.language.current || "ru";
        config.language.showSwitcher = config.language.showSwitcher === true;
        
        config.allowMultipleGenderSelection = config.allowMultipleGenderSelection === true;
        
        if (!Array.isArray(config.allowedGenders) || config.allowedGenders.length === 0) {
            config.allowedGenders = [["man", "woman"], ["boy", "girl"], ["group"]];
        }
        
        config.lightTheme = config.lightTheme || {
            backgroundColor: '#ffebcd',
            backgroundImage: '',
            lightTextColor: '#000000'
        };
        
        config.darkTheme = config.darkTheme || {
            backgroundColor: '#000000',
            backgroundImage: '',
            darkTextColor: '#ffffff'
        };
        
        config.hotFolder = config.hotFolder || { enabled: false, path: '' };
    }
}

module.exports = new ConfigurationService();