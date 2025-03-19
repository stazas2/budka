const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    // Tab switching functionality
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');
        // Remove active class from all buttons and contents
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        // Add active class to clicked button and related content
        button.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
      });
    });

    // Button to open photobooth window
    const openPhotoboothButton = document.getElementById('open-photobooth');
    
    openPhotoboothButton.addEventListener('click', () => {
        // Get the current folder path from main process
        const folderPath = ipcRenderer.sendSync('get-selected-folder');
        
        // Tell main process to open the photobooth window
        ipcRenderer.send('switch-to-photobooth', folderPath);
    });
});
