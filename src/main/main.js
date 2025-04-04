const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const si = require("systeminformation");
const { exec, execSync } = require("child_process");

// Import services and constants
const ConfigurationService = require("./services/ConfigurationService");
const IpcMainHandlers = require("./services/IpcMainHandlers");
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

const WindowManager = require('./services/WindowManager');

const CanonCameraService = require('./services/CanonCameraService');

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
const ProcessMonitor = require('./services/ProcessMonitor');

app.whenReady().then(() => {
    console.log("[App] Ready");
    // Initialize services
    const configurationService = ConfigurationService;
    const ipcHandlers = IpcMainHandlers;
    ProcessMonitor.start();
    
    WindowManager.createLauncherWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            WindowManager.createLauncherWindow();
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

// Window management functions are now called through IpcMainHandlers