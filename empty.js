const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    // Button to open photobooth window
    const openPhotoboothButton = document.getElementById('open-photobooth');
    
    openPhotoboothButton.addEventListener('click', () => {
        // Get the current folder path from main process
        const folderPath = ipcRenderer.sendSync('get-selected-folder');
        
        // Tell main process to open the photobooth window
        ipcRenderer.send('switch-to-photobooth', folderPath);
    });
});
