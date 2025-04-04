const { ipcRenderer } = require('electron');
const IpcChannels = require('../../shared/constants/IpcChannels');

class IpcRendererService {
    constructor() {
        this.listeners = new Map();
    }

    async invoke(channel, data) {
        return ipcRenderer.invoke(channel, data);
    }

    send(channel, data) {
        ipcRenderer.send(channel, data);
    }

    sendSync(channel, data) {
        return ipcRenderer.sendSync(channel, data);
    }

    on(channel, callback) {
        const wrapper = (event, ...args) => callback(...args);
        ipcRenderer.on(channel, wrapper);
        if (!this.listeners.has(channel)) this.listeners.set(channel, []);
        this.listeners.get(channel).push({ callback, wrapper });
        return () => this.off(channel, callback);
    }

    off(channel, callback) {
        const listeners = this.listeners.get(channel) || [];
        const listener = listeners.find(l => l.callback === callback);
        if (listener) {
            ipcRenderer.removeListener(channel, listener.wrapper);
            this.listeners.set(channel, listeners.filter(l => l.callback !== callback));
        }
    }

    removeAllListeners(channel) {
        ipcRenderer.removeAllListeners(channel);
        this.listeners.delete(channel);
    }

    async getConfig() {
        return this.invoke(IpcChannels.GET_CURRENT_CONFIG);
    }

    async saveEventConfig(folderPath, config) {
        return this.invoke(IpcChannels.SAVE_EVENT_CONFIG, { folderPath, config });
    }

    async saveGlobalConfig(config) {
        return this.invoke(IpcChannels.SAVE_GLOBAL_CONFIG, config);
    }

    async printPhoto(imageData, isLandscape) {
        return this.invoke(IpcChannels.PRINT_PHOTO, { imageData, isLandscape });
    }

    async getPrinters() {
        return this.invoke(IpcChannels.GET_PRINTERS);
    }

    selectFile(options) {
        return this.sendSync(IpcChannels.SELECT_FILE, options);
    }

    async getSelectedFolder() {
        return await this.invoke(IpcChannels.GET_SELECTED_FOLDER);
    }

    setSelectedFolder(folderPath) {
        this.send(IpcChannels.SELECTED_FOLDER, folderPath);
    }

    openMainWindow(folderPath) {
        this.send(IpcChannels.OPEN_MAIN_WINDOW, folderPath);
    }

    openConfiguratorWindow(folderPath) {
        this.send(IpcChannels.OPEN_EMPTY_WINDOW, folderPath);
    }

    closeApp() {
        this.send(IpcChannels.CLOSE_APP);
    }

    switchToPhotobooth(folderPath) {
        this.send(IpcChannels.SWITCH_TO_PHOTOBOOTH, folderPath);
    }

    switchToConfigurator(folderPath) {
        this.send(IpcChannels.SWITCH_TO_CONFIGURATOR, folderPath);
    }

    reloadWindows(folderPath) {
        this.send(IpcChannels.RELOAD_OPEN_WINDOWS, folderPath);
    }

    cameraModeChanged(mode) {
        this.send(IpcChannels.CAMERA_MODE_CHANGED, mode);
    }

    async saveImage(folderType, imageData) {
        return this.invoke(IpcChannels.SAVE_IMAGE, { folderType, imageData });
    }

    async ensureFolderExists(path) {
        return this.invoke(IpcChannels.ENSURE_FOLDER_EXISTS, path);
    }
}

module.exports = new IpcRendererService();