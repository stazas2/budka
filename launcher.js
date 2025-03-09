const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Folder path to scan
const FOLDER_PATH = 'C:\\new';

// Function to format date
function formatDate(date) {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
}

// Get folders from the specified path
async function getFolders() {
    const folderListElement = document.getElementById('folderList');
    const refreshButton = document.getElementById('refreshFolders');
    
    // Add spinning animation to refresh button
    refreshButton.classList.add('spinning');
    
    try {
        // Check if the directory exists
        if (!fs.existsSync(FOLDER_PATH)) {
            folderListElement.innerHTML = `
                <div class="error-message">
                    Directory ${FOLDER_PATH} does not exist
                </div>
            `;
            return;
        }

        // Read directory contents
        const items = fs.readdirSync(FOLDER_PATH);
        
        // Filter to only include directories and get their stats
        const folders = items
            .filter(item => {
                try {
                    return fs.statSync(path.join(FOLDER_PATH, item)).isDirectory();
                } catch (err) {
                    console.error(`Error checking if ${item} is directory:`, err);
                    return false;
                }
            })
            .map(folder => {
                try {
                    const stats = fs.statSync(path.join(FOLDER_PATH, folder));
                    return {
                        name: folder,
                        createdAt: stats.birthtime || stats.mtime, // Use mtime as fallback
                        path: path.join(FOLDER_PATH, folder)
                    };
                } catch (err) {
                    console.error(`Error getting stats for ${folder}:`, err);
                    return null;
                }
            })
            .filter(folder => folder !== null)
            // Sort by creation date, newest first
            .sort((a, b) => b.createdAt - a.createdAt);

        // Display folders or "no folders" message
        if (folders.length === 0) {
            folderListElement.innerHTML = `
                <div class="empty-message">
                    No folders found in ${FOLDER_PATH}
                </div>
            `;
        } else {
            const foldersHTML = folders.map(folder => `
                <div class="folder-item" data-path="${folder.path}">
                    <span class="folder-name">${folder.name}</span>
                    <span class="folder-date">${formatDate(folder.createdAt)}</span>
                </div>
            `).join('');
            
            folderListElement.innerHTML = foldersHTML;
            
            // Add click event to folder items
            document.querySelectorAll('.folder-item').forEach(item => {
                item.addEventListener('click', () => {
                    const folderPath = item.getAttribute('data-path');
                    console.log('Selected folder:', folderPath);
                    // Optionally send the selected folder to main process
                    ipcRenderer.send('selected-folder', folderPath);
                    
                    // Highlight selected folder
                    document.querySelectorAll('.folder-item').forEach(f => 
                        f.classList.remove('selected'));
                    item.classList.add('selected');
                });
            });
        }
    } catch (error) {
        console.error('Error reading folders:', error);
        folderListElement.innerHTML = `
            <div class="error-message">
                Error reading folders: ${error.message}
            </div>
        `;
    } finally {
        // Remove spinning animation after loading is complete
        setTimeout(() => {
            refreshButton.classList.remove('spinning');
        }, 500); // Give at least 500ms of animation for better UX
    }
}

// Set up button event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load folders
    getFolders();
    
    // Add refresh button functionality
    const refreshButton = document.getElementById('refreshFolders');
    refreshButton.addEventListener('click', getFolders);
    
    // Add button functionalities
    document.getElementById('openMainWindow').addEventListener('click', () => {
        ipcRenderer.send('open-main-window');
    });
    
    document.getElementById('openEmptyWindow').addEventListener('click', () => {
        ipcRenderer.send('open-empty-window');
    });
    
    document.getElementById('closeApp').addEventListener('click', () => {
        ipcRenderer.send('close-app');
    });
});
