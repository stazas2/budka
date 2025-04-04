const { ipcRenderer } = require('electron');
const IpcChannels = require('../../shared/constants/IpcChannels');

/**
 * Service for handling IPC communication in renderer processes
 * Provides a centralized and type-safe way to communicate with the main process
 */
class IpcRendererService {
    constructor() {
        this.listeners = new Map();
        console.log('[IpcRenderer] Service initialized');
    }

    /**
     * Send a message to the main process and wait for response
     * @template T
     * @param {string} channel - IPC channel name
     * @param {any} [data] - Data to send
     * @returns {Promise<T>} Response from main process
     */
    async invoke(channel, data) {
        try {
            console.log(`[IpcRenderer] Invoking ${channel}`, data);
            const result = await ipcRenderer.invoke(channel, data);
            console.log(`[IpcRenderer] ${channel} result:`, result);
            return result;
        } catch (error) {
            console.error(`[IpcRenderer] Error invoking ${channel}:`, error);
            throw error;
        }
    }

    /**
     * Send a message to the main process without waiting for response
     * @param {string} channel - IPC channel name
     * @param {any} [data] - Data to send
     */
    send(channel, data) {
        console.log(`[IpcRenderer] Sending to ${channel}`, data);
        ipcRenderer.send(channel, data);
    }

    /**
     * Send a synchronous message to the main process
     * @template T
     * @param {string} channel - IPC channel name
     * @param {any} [data] - Data to send
     * @returns {T} Response from main process
     */
    sendSync(channel, data) {
        console.log(`[IpcRenderer] Sending sync to ${channel}`, data);
        return ipcRenderer.sendSync(channel, data);
    }

    /**
     * Listen for messages from the main process
     * @param {string} channel - IPC channel name
     * @param {Function} callback - Callback function
     * @returns {Function} Cleanup function
     */
    on(channel, callback) {
        console.log(`[IpcRenderer] Adding listener for ${channel}`);
        const wrapper = (event, ...args) => callback(...args);
        ipcRenderer.on(channel, wrapper);
        
        // Store listener for cleanup
        if (!this.listeners.has(channel)) {
            this.listeners.set(channel, []);
        }
        this.listeners.get(channel).push({ callback, wrapper });

        // Return cleanup function
        return () => this.off(channel, callback);
    }

    /**
     * Remove a specific listener
     * @param {string} channel - IPC channel name
     * @param {Function} callback - Original callback function
     */
    off(channel, callback) {
        console.log(`[IpcRenderer] Removing listener for ${channel}`);
        const listeners = this.listeners.get(channel) || [];
        const listener = listeners.find(l => l.callback === callback);
        if (listener) {
            ipcRenderer.removeListener(channel, listener.wrapper);
            this.listeners.set(
                channel,
                listeners.filter(l => l.callback !== callback)
            );
        }
    }

    /**
     * Remove all listeners for a channel
     * @param {string} channel - IPC channel name
     */
    removeAllListeners(channel) {
        console.log(`[IpcRenderer] Removing all listeners for ${channel}`);
        ipcRenderer.removeAllListeners(channel);
        this.listeners.delete(channel);
    }

    // Convenience methods for common operations

    /**
     * Get the current configuration
     * @returns {Promise<object>} Current config
     */
    async getConfig() {
        return this.invoke(IpcChannels.GET_CURRENT_CONFIG);
    }

    /**
     * Save event configuration
     * @param {string} folderPath - Event folder path
     * @param {object} config - Configuration to save
     * @returns {Promise<boolean>} Success status
     */
    async saveEventConfig(folderPath, config) {
        return this.invoke(IpcChannels.SAVE_EVENT_CONFIG, { folderPath, config });
    }

    /**
     * Print a photo
     * @param {string} imageData - Image data (base64 or URL)
     * @param {boolean} isLandscape - Image orientation
     * @returns {Promise<boolean>} Success status
     */
    async printPhoto(imageData, isLandscape) {
        return this.invoke(IpcChannels.PRINT_PHOTO, { imageData, isLandscape });
    }

    /**
     * Get available printers
     * @returns {Promise<string[]>} List of printer names
     */
    async getPrinters() {
        return this.invoke(IpcChannels.GET_PRINTERS);
    }

    /**
     * Select a file using system dialog
     * @param {object} options - Dialog options
     * @returns {Promise<{canceled: boolean, filePaths: string[]}>} Selected files
     */
    selectFile(options) {
        return this.sendSync(IpcChannels.SELECT_FILE, options);
    }

    /**
     * Get the currently selected event folder
     * @returns {string|null} Selected folder path
     */
    getSelectedFolder() {
        return this.sendSync(IpcChannels.GET_SELECTED_FOLDER);
    }

    /**
     * Set the selected event folder
     * @param {string} folderPath - Folder path to set
     */
    setSelectedFolder(folderPath) {
        this.send(IpcChannels.SELECTED_FOLDER, folderPath);
    }
}

// Export a singleton instance
module.exports = new IpcRendererService();