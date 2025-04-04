const IpcRendererService = require('./IpcRendererService');

class CanonCameraService {
    constructor() {
        this.isConnected = false;
    }

    async connect() {
        try {
            await IpcRendererService.invoke('connect-canon-camera');
            this.isConnected = true;
        } catch (error) {
            console.error("[CanonCameraService] Error connecting to Canon camera:", error);
            throw error;
        }
    }

    async disconnect() {
        try {
            await IpcRendererService.invoke('disconnect-canon-camera');
            this.isConnected = false;
        } catch (error) {
            console.error("[CanonCameraService] Error disconnecting Canon camera:", error);
            throw error;
        }
    }

    async capturePhoto() {
        try {
            return await IpcRendererService.invoke('capture-canon-photo');
        } catch (error) {
            console.error("[CanonCameraService] Error capturing photo:", error);
            throw error;
        }
    }
}

module.exports = new CanonCameraService();