const { BrowserWindow } = require('electron');
const path = require('path');
const IpcChannels = require('../../shared/constants/IpcChannels');

class WindowManager {
    constructor() {
        this.windows = {
            launcher: null,
            photobooth: null,
            configurator: null
        };
    }

    createLauncherWindow() {
        if (this.windows.launcher) return;

        this.windows.launcher = new BrowserWindow({
            width: 900,
            height: 800,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                preload: path.join(__dirname, '../renderer/renderer-preload.js')
            }
        });

        this.windows.launcher.loadFile(
            path.join(__dirname, '../../windows/launcher/launcher.html')
        );

        this.windows.launcher.on('closed', () => {
            this.windows.launcher = null;
        });
    }

    createPhotoboothWindow(folderPath) {
        if (this.windows.photobooth) {
            this.windows.photobooth.show();
            this.windows.photobooth.focus();
            return;
        }

        this.windows.photobooth = new BrowserWindow({
            width: 1080,
            height: 1440,
            show: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            },
            autoHideMenuBar: true
        });

        this.windows.photobooth.setMenuBarVisibility(false);
        this.windows.photobooth.loadFile(
            path.join(__dirname, '../../windows/photobooth/photobooth.html')
        );

        this.windows.photobooth.webContents.on("did-finish-load", () => {
            this.windows.photobooth.webContents.setZoomFactor(1);
            this.windows.photobooth.show();
        });

        this.windows.photobooth.on("closed", () => {
            this.windows.photobooth = null;
        });
    }

    createConfiguratorWindow(folderPath) {
        if (this.windows.configurator) {
            this.windows.configurator.show();
            this.windows.configurator.focus();
            return;
        }

        this.windows.configurator = new BrowserWindow({
            width: 1080,
            height: 900,
            show: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        this.windows.configurator.loadFile(
            path.join(__dirname, '../../windows/configurator/configurator.html')
        );

        this.windows.configurator.webContents.on("did-finish-load", () => {
            this.windows.configurator.show();
        });

        this.windows.configurator.on('closed', () => {
            this.windows.configurator = null;
        });
    }

    closeAllWindows() {
        Object.values(this.windows).forEach(win => {
            if (win) win.close();
        });
    }
}

module.exports = new WindowManager();