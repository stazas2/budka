const { ipcMain, app, dialog } = require('electron');
const IpcChannels = require('../../shared/constants/IpcChannels');
const ConfigurationService = require('./ConfigurationService');
const PrintService = require('./PrintService');
const WindowManager = require('./WindowManager');
const CanonCameraService = require('./CanonCameraService');

class IpcMainHandlers {
    constructor() {
        this.setupHandlers();
        console.log('[IpcMain] IPC handlers initialized');
    }

    setupHandlers() {
        ipcMain.handle(IpcChannels.GET_CURRENT_CONFIG, () => 
            ConfigurationService.getCurrentConfig());
            
        ipcMain.handle(IpcChannels.SAVE_EVENT_CONFIG, (event, {folderPath, config}) =>
            ConfigurationService.saveEventConfig(folderPath, config));
            
        ipcMain.handle(IpcChannels.SAVE_GLOBAL_CONFIG, (event, config) => 
            ConfigurationService.saveGlobalConfig(config));

        ipcMain.on(IpcChannels.OPEN_MAIN_WINDOW, (event, folderPath) => {
            WindowManager.createPhotoboothWindow(folderPath);
        });

        ipcMain.on(IpcChannels.OPEN_EMPTY_WINDOW, (event, folderPath) => {
            WindowManager.createConfiguratorWindow(folderPath);
        });

        ipcMain.on(IpcChannels.CLOSE_APP, () => {
            app.quit();
        });

        ipcMain.on(IpcChannels.SWITCH_TO_PHOTOBOOTH, (event, folderPath) => {
            WindowManager.createPhotoboothWindow(folderPath);
        });

        ipcMain.on(IpcChannels.SWITCH_TO_CONFIGURATOR, (event, folderPath) => {
            WindowManager.createConfiguratorWindow(folderPath);
        });

        ipcMain.on(IpcChannels.RELOAD_OPEN_WINDOWS, (event, folderPath) => {
            WindowManager.closeAllWindows();
            WindowManager.createLauncherWindow();
        });

        ipcMain.handle(IpcChannels.PRINT_PHOTO, async (event, {imageData, isLandscape}) => {
            const config = ConfigurationService.getCurrentConfig();
            return PrintService.printPhoto(imageData, config, isLandscape);
        });

        ipcMain.handle(IpcChannels.GET_PRINTERS, () => {
            // TODO: Integrate printer listing
            return [];
        });

        ipcMain.handle(IpcChannels.SELECT_FILE, (event, options) => {
            const win = event.sender.getOwnerBrowserWindow();
            const result = dialog.showOpenDialogSync(win, options);
            return {
                canceled: !result,
                filePaths: result || []
            };
        });

        ipcMain.handle(IpcChannels.GET_SELECTED_FOLDER, () => {
            return global.appState?.selectedFolderPath || null;
        });

        ipcMain.handle(IpcChannels.GET_CONFIG, () => {
            return ConfigurationService.getCurrentConfig();
        });

        ipcMain.handle(IpcChannels.ENSURE_FOLDER_EXISTS, async (event, folderPath) => {
            const fs = require('fs');
            const path = require('path');
            try {
                if (!fs.existsSync(folderPath)) {
                    fs.mkdirSync(folderPath, { recursive: true });
                }
                return { success: true };
            } catch (error) {
                console.error('Failed to ensure folder exists:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle(IpcChannels.GET_STYLES, async (event, genders) => {
            const fs = require('fs').promises;
            const path = require('path');
            const config = ConfigurationService.getCurrentConfig();
            // Resolve stylesDir correctly, handling potential template and relative paths
            let stylesDir = config?.stylesDir || '';
            if (stylesDir.includes("{{basePath}}") && config.basePath) {
                stylesDir = stylesDir.replace("{{basePath}}", config.basePath);
            } else if (!path.isAbsolute(stylesDir) && config.basePath) {
                stylesDir = path.join(config.basePath, stylesDir);
            } else if (!stylesDir && config.basePath) {
                stylesDir = path.join(config.basePath, 'styles');
            }

            if (!stylesDir) {
                console.error('Styles directory not configured or basePath missing.');
                return [];
            }

            let availableStyles = [];
            try {
                for (const gender of genders) {
                    const genderPath = path.join(stylesDir, gender);
                    try {
                        const entries = await fs.readdir(genderPath, { withFileTypes: true });
                        const directories = entries
                            .filter(dirent => dirent.isDirectory())
                            .map(dirent => ({
                                originalName: dirent.name,
                                displayName: dirent.name // TODO: Read display name from metadata if needed
                            }));
                        availableStyles = availableStyles.concat(directories);
                    } catch (err) {
                        // Ignore if gender directory doesn't exist
                        if (err.code !== 'ENOENT') {
                            console.error(`Error reading styles for gender ${gender} in ${genderPath}:`, err);
                        } else {
                            console.log(`Directory not found for gender ${gender}: ${genderPath}`);
                        }
                    }
                }
                // Remove duplicates based on originalName
                const uniqueStyles = availableStyles.filter((style, index, self) =>
                    index === self.findIndex((s) => s.originalName === style.originalName)
                );
                console.log(`[IpcMain] Found styles for genders [${genders.join(', ')}]:`, uniqueStyles.map(s => s.originalName));
                return uniqueStyles;
            } catch (error) {
                console.error('Error fetching styles:', error);
                return []; // Return empty array on error
                ipcMain.handle(IpcChannels.GET_STYLE_PREVIEW_IMAGE, async (event, { style, sanitizedName, genders }) => {
                    const fs = require('fs');
                    const path = require('path');
                    const config = ConfigurationService.getCurrentConfig();
                    let stylesDir = config?.stylesDir || '';
                    if (stylesDir.includes("{{basePath}}") && config.basePath) {
                        stylesDir = stylesDir.replace("{{basePath}}", config.basePath);
                    } else if (!path.isAbsolute(stylesDir) && config.basePath) {
                        stylesDir = path.join(config.basePath, stylesDir);
                    } else if (!stylesDir && config.basePath) {
                        stylesDir = path.join(config.basePath, 'styles');
                    }
        
                    if (!stylesDir) return null;
        
                    const possiblePaths = [];
                    for (const gender of genders) {
                        possiblePaths.push(path.join(stylesDir, gender, style, `${sanitizedName}.jpg`));
                        possiblePaths.push(path.join(stylesDir, gender, style, 'preview.jpg'));
                    }
        
                    for (const p of possiblePaths) {
                        if (fs.existsSync(p)) {
                            return p; // Return the first found path
                        }
                    }
                    return null; // Return null if no preview found
                });
        
                ipcMain.handle(IpcChannels.CHECK_LOGO_EXISTS, async () => {
                    const fs = require('fs');
                    const config = ConfigurationService.getCurrentConfig();
                    const logoPath = config?.logoPath;
                    return logoPath && fs.existsSync(logoPath);
                });
        
                ipcMain.handle(IpcChannels.CHECK_STYLE_PATH_EXISTS, async (event, { stylePath }) => {
                    const fs = require('fs');
                    return fs.existsSync(stylePath);
                });
        
                ipcMain.handle(IpcChannels.GET_STYLE_FILES, async (event, { stylePath }) => {
                    const fs = require('fs').promises;
                    try {
                        const files = await fs.readdir(stylePath);
                        return files.filter(file => /\.(jpg|jpeg|png)$/i.test(file));
                    } catch (error) {
                        console.error('Error reading style files:', error);
                        return [];
                    }
                });
        
                ipcMain.handle(IpcChannels.GET_STYLE_IMAGE_DATA, async (event, { imagePath }) => {
                    const fs = require('fs').promises;
                    try {
                        const data = await fs.readFile(imagePath, { encoding: 'base64' });
                        return `data:image/jpeg;base64,${data}`;
                    } catch (error) {
                        console.error('Error reading style image data:', error);
                        return null;
                    }
                });
        
                ipcMain.handle(IpcChannels.GET_CANON_IMAGE, async (event, { imagePath }) => {
                     const fs = require('fs').promises;
                     try {
                         const data = await fs.readFile(imagePath, { encoding: 'base64' });
                         return `data:image/jpeg;base64,${data}`;
                     } catch (error) {
                         console.error('Error reading canon image data:', error);
                         return null;
                     }
                });
        
                ipcMain.handle(IpcChannels.DELETE_PHOTO, async (event, { filePath }) => {
                    const fs = require('fs').promises;
                    try {
                        await fs.unlink(filePath);
                        return { success: true };
                    } catch (error) {
                        console.error('Error deleting photo:', error);
                        return { success: false, error: error.message };
                    }
                });
        
                ipcMain.handle(IpcChannels.GET_TRANSLATIONS, async () => {
                    const fs = require('fs');
                    const path = require('path');
                    try {
                        // Assuming translations.json is now in src/renderer/assets
                        const translationsPath = path.join(app.getAppPath(), 'src', 'renderer', 'assets', 'translations.json');
                        if (fs.existsSync(translationsPath)) {
                            const data = fs.readFileSync(translationsPath, 'utf8');
                            return JSON.parse(data);
                        }
                        return {};
                    } catch (error) {
                        console.error('Error loading translations:', error);
                        return {};
                    }
                });
            }
        });

        const ImageSaveService = require('./ImageSaveService');
        ipcMain.handle(IpcChannels.SAVE_IMAGE, async (event, {folderType, imageData}) => {
            return await ImageSaveService.saveImage(folderType, imageData);
        });

        ipcMain.on(IpcChannels.CONFIG_UPDATED, (event, folderPath) => {
            console.log(`[IpcMain] Config updated for ${folderPath}`);
            // TODO: Notify windows
        });

        ipcMain.on(IpcChannels.CAMERA_MODE_CHANGED, (event, mode) => {
            if (mode === 'canon') {
                CanonCameraService.start();
            } else {
                CanonCameraService.stop();
                ipcMain.handle(IpcChannels.LIST_EVENT_FOLDER_NAMES, async (event, { eventsBasePath }) => {
                    const fs = require('fs');
                    const path = require('path');
                    try {
                        if (!fs.existsSync(eventsBasePath)) {
                            return { success: true, items: [] };
                            ipcMain.handle(IpcChannels.CREATE_EVENT_FOLDER, async (event, { basePath, eventDate, eventName }) => {
                                const fs = require('fs');
                                const path = require('path');
                                try {
                                    const folderName = `${eventDate}_${eventName}`;
                                    const eventFolderPath = path.join(basePath, folderName);
                    
                                    if (fs.existsSync(eventFolderPath)) {
                                        return { success: false, error: 'Folder already exists' };
                                        ipcMain.handle(IpcChannels.CREATE_EVENT_FOLDER, async (event, { basePath, eventDate, eventName }) => {
                                            const fs = require('fs');
                                            const path = require('path');
                                            try {
                                                const folderName = `${eventDate}_${eventName}`;
                                                const eventFolderPath = path.join(basePath, folderName);
                                
                                                if (fs.existsSync(eventFolderPath)) {
                                                    return { success: false, error: 'Folder already exists' };
                                                }
                                
                                                fs.mkdirSync(eventFolderPath, { recursive: true });
                                
                                                // Copy from default if exists
                                                const defaultFolderPath = path.join(basePath, 'default');
                                                if (fs.existsSync(defaultFolderPath)) {
                                                    // TODO: Implement copyFolderContents or use a library
                                                    console.warn('Copying from default folder not implemented yet.');
                                                }
                                
                                                return { success: true };
                                            } catch (error) {
                                                console.error('Error creating event folder:', error);
                                                return { success: false, error: error.message };
                                            }
                                        });
                                
                                        ipcMain.handle(IpcChannels.DELETE_EVENT_FOLDER, async (event, { folderPath }) => {
                                            const fs = require('fs');
                                            try {
                                                if (fs.existsSync(folderPath)) {
                                                    fs.rmSync(folderPath, { recursive: true, force: true });
                                                    return { success: true };
                                                }
                                                return { success: false, error: 'Folder not found' };
                                            } catch (error) {
                                                console.error('Error deleting event folder:', error);
                                                return { success: false, error: error.message };
                                            }
                                        });
                                
                                        ipcMain.handle(IpcChannels.GET_EVENT_CONFIG, async (event, { folderPath }) => {
                                            const fs = require('fs');
                                            const path = require('path');
                                            try {
                                                const configPath = path.join(folderPath, 'config.json');
                                                if (!fs.existsSync(configPath)) {
                                                    return { success: false, error: 'Config file not found' };
                                                }
                                                const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                                                return { success: true, config: configData };
                                            } catch (error) {
                                                console.error('Error reading event config:', error);
                                                return { success: false, error: error.message };
                                            }
                                        });
                                
                                        // Verify SAVE_EVENT_CONFIG handler (already exists, but ensure it's correct)
                                        // The existing handler seems correct:
                                        // ipcMain.handle(IpcChannels.SAVE_EVENT_CONFIG, (event, {folderPath, config}) =>
                                        //     ConfigurationService.saveEventConfig(folderPath, config));
                                
                                        ipcMain.handle(IpcChannels.LIST_EVENT_FOLDERS, async (event, { basePath }) => {
                                            const fs = require('fs');
                                            const path = require('path');
                                            try {
                                                if (!fs.existsSync(basePath)) {
                                                    return { success: true, folders: [] };
                                                }
                                                const items = fs.readdirSync(basePath);
                                                const folders = items
                                                    .filter(item => {
                                                        try {
                                                            // Exclude 'default' folder
                                                            if (item === "default") return false;
                                                            return fs.statSync(path.join(basePath, item)).isDirectory();
                                                        } catch {
                                                            return false;
                                                        }
                                                    })
                                                    .map(folderName => {
                                                        try {
                                                            const folderPath = path.join(basePath, folderName);
                                                            const stats = fs.statSync(folderPath);
                                                            return {
                                                                name: folderName,
                                                                createdAt: stats.birthtime || stats.mtime,
                                                                path: folderPath
                                                            };
                                                        } catch {
                                                            return null;
                                                        }
                                                    })
                                                    .filter(f => f !== null);
                                                return { success: true, folders: folders };
                                            } catch (error) {
                                                console.error('Error listing event folders:', error);
                                                return { success: false, error: error.message };
                                            }
                                        });
                                    }
                    
                                    fs.mkdirSync(eventFolderPath, { recursive: true });
                    
                                    // Copy from default if exists
                                    const defaultFolderPath = path.join(basePath, 'default');
                                    if (fs.existsSync(defaultFolderPath)) {
                                        // TODO: Implement copyFolderContents or use a library
                                        console.warn('Copying from default folder not implemented yet.');
                                    }
                    
                                    return { success: true };
                                } catch (error) {
                                    console.error('Error creating event folder:', error);
                                    return { success: false, error: error.message };
                                }
                            });
                    
                            ipcMain.handle(IpcChannels.DELETE_EVENT_FOLDER, async (event, { folderPath }) => {
                                const fs = require('fs');
                                try {
                                    if (fs.existsSync(folderPath)) {
                                        fs.rmSync(folderPath, { recursive: true, force: true });
                                        return { success: true };
                                    }
                                    return { success: false, error: 'Folder not found' };
                                } catch (error) {
                                    console.error('Error deleting event folder:', error);
                                    return { success: false, error: error.message };
                                }
                            });
                    
                            ipcMain.handle(IpcChannels.GET_EVENT_CONFIG, async (event, { folderPath }) => {
                                const fs = require('fs');
                                const path = require('path');
                                try {
                                    const configPath = path.join(folderPath, 'config.json');
                                    if (!fs.existsSync(configPath)) {
                                        return { success: false, error: 'Config file not found' };
                                    }
                                    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                                    return { success: true, config: configData };
                                } catch (error) {
                                    console.error('Error reading event config:', error);
                                    return { success: false, error: error.message };
                                }
                            });
                    
                            // Verify SAVE_EVENT_CONFIG handler (already exists, but ensure it's correct)
                            // The existing handler seems correct:
                            // ipcMain.handle(IpcChannels.SAVE_EVENT_CONFIG, (event, {folderPath, config}) =>
                            //     ConfigurationService.saveEventConfig(folderPath, config));
                    
                            ipcMain.handle(IpcChannels.LIST_EVENT_FOLDERS, async (event, { basePath }) => {
                                const fs = require('fs');
                                const path = require('path');
                                try {
                                    if (!fs.existsSync(basePath)) {
                                        return { success: true, folders: [] };
                                    }
                                    const items = fs.readdirSync(basePath);
                                    const folders = items
                                        .filter(item => {
                                            try {
                                                // Exclude 'default' folder
                                                if (item === "default") return false;
                                                return fs.statSync(path.join(basePath, item)).isDirectory();
                                            } catch {
                                                return false;
                                            }
                                        })
                                        .map(folderName => {
                                            try {
                                                const folderPath = path.join(basePath, folderName);
                                                const stats = fs.statSync(folderPath);
                                                return {
                                                    name: folderName,
                                                    createdAt: stats.birthtime || stats.mtime,
                                                    path: folderPath
                                                };
                                            } catch {
                                                return null;
                                            }
                                        })
                                        .filter(f => f !== null);
                                    return { success: true, folders: folders };
                                } catch (error) {
                                    console.error('Error listing event folders:', error);
                                    return { success: false, error: error.message };
                                }
                            });
                        }
                        const items = fs.readdirSync(eventsBasePath);
                        const folders = items
                            .filter(item => {
                                try {
                                    return fs.statSync(path.join(eventsBasePath, item)).isDirectory();
                                } catch {
                                    return false;
                                }
                            })
                            .map(folderName => {
                                try {
                                    const folderPath = path.join(eventsBasePath, folderName);
                                    const stats = fs.statSync(folderPath);
                                    return {
                                        name: folderName,
                                        createdAt: stats.birthtime || stats.mtime,
                                        path: folderPath
                                    };
                                } catch {
                                    return null;
                                }
                            })
                            .filter(f => f !== null)
                            .sort((a, b) => b.createdAt - a.createdAt);
                        return { success: true, items: folders };
                    } catch (error) {
                        console.error('Error listing event folders:', error);
                        return { success: false, error: error.message };
                    }
                });
            }
        });
        ipcMain.handle(IpcChannels.VALIDATE_FOLDER_STRUCTURE, async (event, { basePath }) => {
            const fs = require('fs');
            const path = require('path');
            try {
                if (!fs.existsSync(basePath)) {
                    return {
                        success: true,
                        result: {
                            valid: false,
                            message: `Директория ${basePath} не существует`
                        }
                    };
                }

                const items = fs.readdirSync(basePath);

                const hasExeFile = items.some(item =>
                    item.endsWith('.exe') && fs.statSync(path.join(basePath, item)).isFile()
                );

                const hasJsonFile = items.some(item =>
                    item.endsWith('.json') && fs.statSync(path.join(basePath, item)).isFile()
                );

                const userFolderPath = path.join(basePath, 'UserFolder');
                const hasUserFolder = fs.existsSync(userFolderPath) && fs.statSync(userFolderPath).isDirectory();

                const eventsPath = path.join(userFolderPath, 'Events');
                const hasEventsFolder = hasUserFolder &&
                    fs.existsSync(eventsPath) &&
                    fs.statSync(eventsPath).isDirectory();

                const missingItems = [];
                if (!hasExeFile) missingItems.push('*.exe файл');
                if (!hasJsonFile) missingItems.push('*.json файл');
                if (!hasUserFolder) missingItems.push("папка 'UserFolder'");
                else if (!hasEventsFolder) missingItems.push("папка 'Events' внутри 'UserFolder'");

                if (missingItems.length > 0) {
                    return {
                        success: true,
                        result: {
                            valid: false,
                            message: `Некорректная структура папки. Отсутствуют: ${missingItems.join(', ')}`
                        }
                    };
                }

                return {
                    success: true,
                    result: {
                        valid: true,
                        eventsPath
                    }
                };
            } catch (error) {
                console.error('Error in validate-folder-structure:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
    }
}

module.exports = new IpcMainHandlers();