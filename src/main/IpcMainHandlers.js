const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const IpcChannels = require('../../shared/constants/IpcChannels');

ipcMain.handle(IpcChannels.ENSURE_FOLDER_EXISTS, async (event, folderPath) => {
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

// Placeholder: add other ipcMain.handle(...) calls here as needed

const { saveImage } = require('./services/ImageSaveService');

ipcMain.handle(IpcChannels.SAVE_IMAGE, async (event, { folderType, imageData }) => {
   return await saveImage(folderType, imageData);
});