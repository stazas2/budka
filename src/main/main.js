const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const si = require("systeminformation");
const { exec, execSync } = require("child_process");

// Import services and constants
const ConfigurationService = require("./services/ConfigurationService");
const { initializeIpcHandlers } = require("./services/IpcMainHandlers");
const IpcChannels = require("../shared/constants/IpcChannels");

// Define global variable for selected folder path
global.appState = {
    selectedFolderPath: null,
    config: ConfigurationService.getCurrentConfig(),
    mainWindow: null,
    launcherWindow: null,
    configuratorWindow: null,
    cameraCheckInterval: null,
    isCanonRunning: false,
};

// For backward compatibility
global.selectedFolderPath = null;

function updateGlobalConfigState(newConfig) {
    global.appState.config = newConfig;
    notifyWindowsOfConfigUpdate(newConfig);
}

function createLauncherWindow() {
    if (global.appState.launcherWindow) return;

    global.appState.launcherWindow = new BrowserWindow({
        width: 900,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, '../renderer/renderer-preload.js')
        }
    });

    global.appState.launcherWindow.loadFile(path.join(__dirname, '../windows/launcher/launcher.html'));

    global.appState.launcherWindow.on('closed', () => {
        console.log("[Window] Launcher closed.");
        global.appState.launcherWindow = null;
        if (global.appState.mainWindow) global.appState.mainWindow.close();
        if (global.appState.configuratorWindow) global.appState.configuratorWindow.close();
    });
}

function createPhotoboothWindow(folderPath) {
    if (global.appState.mainWindow) {
        console.log("[Window] Photobooth window already exists. Focusing or reloading.");
        if (global.selectedFolderPath !== folderPath) {
            setSelectedFolder(folderPath);
        }
        global.appState.mainWindow.show();
        global.appState.mainWindow.focus();
        return;
    }

    console.log('[Window] Creating Photobooth window with folder path:', folderPath);
    setSelectedFolder(folderPath);

    global.appState.mainWindow = new BrowserWindow({
        width: 1080,
        height: 1440,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        autoHideMenuBar: true,
    });

    global.appState.mainWindow.setMenuBarVisibility(false);
    global.appState.mainWindow.loadFile(path.join(__dirname, '../windows/photobooth/photobooth.html'));

    global.appState.mainWindow.webContents.on("did-finish-load", () => {
        console.log("[Window] Photobooth window finished loading.");
        global.appState.mainWindow.webContents.setZoomFactor(1);
        if (global.selectedFolderPath) {
            global.appState.mainWindow.webContents.send(IpcChannels.SELECTED_FOLDER_PATH, global.selectedFolderPath);
            global.appState.mainWindow.webContents.send(IpcChannels.CONFIG_UPDATE, global.appState.config);
            console.log(`[Window] Sent initial path and config to Photobooth window.`);
        }
        startCanonCameraIfNeeded();
        global.appState.mainWindow.show();
    });

    global.appState.mainWindow.on("closed", () => {
        console.log("[Window] Photobooth window closed.");
        global.appState.mainWindow = null;
        stopCanonCameraIfNeeded();
    });

    global.appState.mainWindow.on("error", (error) => {
        console.error("[Window] Photobooth window error:", error);
    });
}

function createConfiguratorWindow(folderPath) {
    if (global.appState.configuratorWindow) {
        console.log("[Window] Configurator window already exists. Focusing or reloading.");
        if (global.selectedFolderPath !== folderPath) {
            setSelectedFolder(folderPath);
        }
        global.appState.configuratorWindow.show();
        global.appState.configuratorWindow.focus();
        return;
    }

    console.log('[Window] Creating Configurator window with folder path:', folderPath);
    setSelectedFolder(folderPath);

    global.appState.configuratorWindow = new BrowserWindow({
        width: 1080,
        height: 900,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });

    global.appState.configuratorWindow.loadFile(path.join(__dirname, '../windows/configurator/configurator.html'));

    global.appState.configuratorWindow.webContents.on("did-finish-load", () => {
        console.log("[Window] Configurator window finished loading.");
        if (global.selectedFolderPath) {
            global.appState.configuratorWindow.webContents.send(IpcChannels.SELECTED_FOLDER_PATH, global.selectedFolderPath);
            global.appState.configuratorWindow.webContents.send(IpcChannels.CONFIG_UPDATE, global.appState.config);
            console.log(`[Window] Sent initial path and config to Configurator window.`);
        }
        global.appState.configuratorWindow.show();
    });

    global.appState.configuratorWindow.on('closed', () => {
        console.log("[Window] Configurator window closed.");
        global.appState.configuratorWindow = null;
    });

    global.appState.configuratorWindow.on("error", (error) => {
        console.error("[Window] Configurator window error:", error);
    });
}

function startCanonCameraIfNeeded() {
    if (global.appState.config?.cameraMode === "canon" && !global.appState.isCanonRunning) {
        console.log("[Canon] Starting Canon camera processes...");
        try {
            const canonAppDir = path.resolve(app.getAppPath(), '..', 'canon');
            console.log(`[Canon] Canon App Directory: ${canonAppDir}`);

            if (!fs.existsSync(path.join(canonAppDir, 'start.bat'))) {
                console.error(`[Canon] start.bat not found in ${canonAppDir}`);
                dialog.showErrorBox("Ошибка Canon", `Файл start.bat не найден в ${canonAppDir}`);
                return;
            }

            exec("start.bat", { cwd: canonAppDir }, (error, stdout, stderr) => {
                if (error) {
                    console.error("[Canon] Failed to start Canon camera:", error);
                    dialog.showErrorBox("Ошибка Canon", `Не удалось запустить Canon камеру: ${error.message}`);
                    return;
                }
                console.log("[Canon] start.bat stdout:", stdout || "N/A");
                console.error("[Canon] start.bat stderr:", stderr || "N/A");
                global.appState.isCanonRunning = true;
                if (!global.appState.cameraCheckInterval) {
                    global.appState.cameraCheckInterval = setInterval(checkCameraControlProcess, 2000);
                }
            });
        } catch (err) {
            console.error("[Canon] Error executing start.bat:", err);
            dialog.showErrorBox("Ошибка Canon", `Ошибка запуска start.bat: ${err.message}`);
        }
    } else if (global.appState.config?.cameraMode === "canon" && global.appState.isCanonRunning) {
        console.log("[Canon] Canon processes already considered running.");
        if (!global.appState.cameraCheckInterval) {
            global.appState.cameraCheckInterval = setInterval(checkCameraControlProcess, 5000);
        }
    }
}

function stopCanonCameraIfNeeded() {
    if (global.appState.config?.cameraMode === "canon" && global.appState.isCanonRunning) {
        console.log("[Canon] Stopping Canon camera processes...");
        if (global.appState.cameraCheckInterval) {
            clearInterval(global.appState.cameraCheckInterval);
            global.appState.cameraCheckInterval = null;
        }
        try {
            execSync("taskkill /IM Api.exe /F");
            execSync("taskkill /IM CameraControl.exe /F");
            execSync("taskkill /IM CameraControllerClient.exe /F");
            console.log("[Canon] Processes stopped via taskkill.");
            global.appState.isCanonRunning = false;
            notifyWindowsOfCanonStatus(false);
        } catch (error) {
            console.error("[Canon] Failed to stop Canon processes (maybe not running or permission issue):", error.message);
            global.appState.isCanonRunning = false;
            notifyWindowsOfCanonStatus(false);
        }
    }
}

function checkCameraControlProcess() {
    exec('tasklist /FI "IMAGENAME eq CameraControl.exe"', (error, stdout, stderr) => {
        if (error) {
            if (global.appState.isCanonRunning) {
                console.log("[Canon] CameraControl.exe seems to have stopped.");
                global.appState.isCanonRunning = false;
                notifyWindowsOfCanonStatus(false);
            }
            return;
        }
        const isRunning = stdout.toLowerCase().includes("cameracontrol.exe");
        if (isRunning && !global.appState.isCanonRunning) {
            console.log("[Canon] CameraControl.exe detected running.");
            global.appState.isCanonRunning = true;
            notifyWindowsOfCanonStatus(true);
            if (global.appState.cameraCheckInterval) {
                clearInterval(global.appState.cameraCheckInterval);
                global.appState.cameraCheckInterval = setInterval(checkCameraControlProcess, 10000);
            }
        } else if (!isRunning && global.appState.isCanonRunning) {
            console.log("[Canon] CameraControl.exe detected stopped.");
            global.appState.isCanonRunning = false;
            notifyWindowsOfCanonStatus(false);
        }
    });
}

function notifyWindowsOfCanonStatus(isRunning) {
    const windows = [global.appState.mainWindow, global.appState.configuratorWindow];
    windows.forEach(win => {
        if (win && win.webContents) {
            win.webContents.send(IpcChannels.CAMERA_CONTROL_STATUS, isRunning);
        }
    });
}

function notifyWindowsOfConfigUpdate(newConfig) {
    const windows = [global.appState.mainWindow, global.appState.configuratorWindow, global.appState.launcherWindow];
    windows.forEach(win => {
        if (win && win.webContents) {
            console.log(`[IPC] Sending config update to window ID: ${win.id}`);
            win.webContents.send(IpcChannels.CONFIG_UPDATE, newConfig);
        }
    });
}

global.setSelectedFolder = (folderPath) => {
    console.log('[State] Setting selected folder:', folderPath);
    if (!folderPath) {
        console.warn('[State] Attempted to set undefined folder path');
        global.selectedFolderPath = null;
        global.appState.selectedFolderPath = null;
        updateGlobalConfigState(ConfigurationService.loadInitialConfig());
        return;
    }

    global.selectedFolderPath = folderPath;
    global.appState.selectedFolderPath = folderPath;

    try {
        const newConfig = ConfigurationService.loadConfigForEvent(folderPath);
        updateGlobalConfigState(newConfig);
    } catch (error) {
        console.error('[State] Error loading config for folder:', error);
        updateGlobalConfigState(ConfigurationService.loadInitialConfig());
    }
};

// Make functions available to IpcMainHandlers
global.notifyWindowsOfConfigUpdate = notifyWindowsOfConfigUpdate;
global.handleCameraModeChange = (cameraMode) => {
    if (cameraMode === 'canon') {
        startCanonCameraIfNeeded();
    } else {
        stopCanonCameraIfNeeded();
    }
};

// App lifecycle
app.whenReady().then(() => {
    console.log("[App] Ready");
    initializeIpcHandlers();
    createLauncherWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createLauncherWindow();
        }
    });
});

app.on('window-all-closed', () => {
    console.log("[App] All windows closed");
    if (process.platform !== 'darwin' && !global.appState.launcherWindow) {
        console.log("[App] Quitting...");
        app.quit();
    } else if (!global.appState.launcherWindow) {
        console.log("[App] Quitting (non-darwin)...");
        app.quit();
    }
    else {
        console.log("[App] Launcher window might still be open or platform is darwin.");
    }
});

app.on("before-quit", () => {
    console.log("[App] Before quit event");
    stopCanonCameraIfNeeded();
});

app.on("error", (error) => {
    console.error("[App] Uncaught App Error:", error);
});

process.on("uncaughtException", (error) => {
    console.error("[Process] Uncaught Exception:", error);
    dialog.showErrorBox("Непредвиденная ошибка", `Произошла ошибка: ${error.message}\n\nПриложение может работать нестабильно.`);
});

process.on("unhandledRejection", (error) => {
    console.error("[Process] Unhandled Rejection:", error);
    dialog.showErrorBox("Необработанная ошибка Promise", `Произошла ошибка: ${error.message || error}`);
});

// IPC handlers for window management
ipcMain.on(IpcChannels.OPEN_MAIN_WINDOW, (event, folderPath) => {
    console.log(`[IPC] Request to open Photobooth for: ${folderPath}`);
    if (global.appState.configuratorWindow) {
        global.appState.configuratorWindow.close();
    }
    createPhotoboothWindow(folderPath);
});

ipcMain.on(IpcChannels.OPEN_EMPTY_WINDOW, (event, folderPath) => {
    console.log(`[IPC] Request to open Configurator for: ${folderPath}`);
    if (global.appState.mainWindow) {
        global.appState.mainWindow.close();
    }
    createConfiguratorWindow(folderPath);
});

ipcMain.on(IpcChannels.CLOSE_APP, () => {
    console.log("[IPC] Request to close app.");
    app.quit();
});

ipcMain.on(IpcChannels.SWITCH_TO_PHOTOBOOTH, (event, folderPath) => {
    console.log(`[IPC] Request to switch to Photobooth for: ${folderPath}`);
    if (global.appState.configuratorWindow) {
        global.appState.configuratorWindow.close();
    }
    createPhotoboothWindow(folderPath);
});

ipcMain.on(IpcChannels.SWITCH_TO_CONFIGURATOR, (event, folderPath) => {
    console.log(`[IPC] Request to switch to Configurator for: ${folderPath}`);
    if (global.appState.mainWindow) {
        global.appState.mainWindow.close();
    }
    createConfiguratorWindow(folderPath);
});

ipcMain.on(IpcChannels.RELOAD_OPEN_WINDOWS, (event, folderPath) => {
    console.log(`[IPC] Request to reload windows for folder: ${folderPath}`);
    setSelectedFolder(folderPath);
    if (global.appState.mainWindow) {
        console.log('[IPC] Closing existing Photobooth window for reload.');
        global.appState.mainWindow.close();
    }
    if (global.appState.configuratorWindow) {
        console.log('[IPC] Closing existing Configurator window for reload.');
        global.appState.configuratorWindow.close();
    }
});