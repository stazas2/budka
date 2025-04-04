const IpcRendererService = require('../../services/IpcRendererService');

class FilePicker {
    async selectFile(options = {}) {
        try {
            const result = await IpcRendererService.invoke('select-file', options);
            return result;
        } catch (error) {
            console.error("[FilePicker] Error selecting file:", error);
            throw error;
        }
    }
}

module.exports = new FilePicker();