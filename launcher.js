const { ipcRenderer } = require('electron');

document.getElementById('openMainWindow').addEventListener('click', () => {
    ipcRenderer.send('open-main-window');
});

document.getElementById('openEmptyWindow').addEventListener('click', () => {
    ipcRenderer.send('open-empty-window');
});

document.getElementById('closeApp').addEventListener('click', () => {
    ipcRenderer.send('close-app');
});
