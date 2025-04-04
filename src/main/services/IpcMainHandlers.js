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