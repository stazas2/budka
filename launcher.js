const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const { config } = require('process');
const { loadConfig } = require("./utils/configLoader");

// Load initial config - without a selected folder path
const initialConfig = loadConfig();

// Folder path to scan - use configured path or fallback
const FOLDER_PATH = initialConfig.globalFolderPath || "C:\\temp";

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

// Check if the folder structure is valid
function validateFolderStructure(basePath) {
    try {
        // Check if the base path exists
        if (!fs.existsSync(basePath)) {
            return {
                valid: false,
                message: `Директория ${basePath} не существует`
            };
        }
        
        // Get all items in the base directory
        const items = fs.readdirSync(basePath);
        
        // Check for required files (.exe, .json)
        const hasExeFile = items.some(item => {
            return item.endsWith('.exe') && fs.statSync(path.join(basePath, item)).isFile();
        });
        
        const hasJsonFile = items.some(item => {
            return item.endsWith('.json') && fs.statSync(path.join(basePath, item)).isFile();
        });
        
        // Check for UserFolder directory
        const userFolderPath = path.join(basePath, 'UserFolder');
        const hasUserFolder = fs.existsSync(userFolderPath) && 
                             fs.statSync(userFolderPath).isDirectory();
        
        // Check for Events directory inside UserFolder
        const eventsPath = path.join(userFolderPath, 'Events');
        const hasEventsFolder = hasUserFolder && 
                               fs.existsSync(eventsPath) && 
                               fs.statSync(eventsPath).isDirectory();
        
        // Build validation result
        const missingItems = [];
        if (!hasExeFile) missingItems.push("*.exe файл");
        if (!hasJsonFile) missingItems.push("*.json файл");
        if (!hasUserFolder) missingItems.push("папка 'UserFolder'");
        else if (!hasEventsFolder) missingItems.push("папка 'Events' внутри 'UserFolder'");
        
        if (missingItems.length > 0) {
            return {
                valid: false,
                message: `Некорректная структура папки. Отсутствуют: ${missingItems.join(', ')}`
            };
        }
        
        return {
            valid: true,
            eventsPath: eventsPath
        };
    } catch (error) {
        console.error('Ошибка при проверке структуры папки:', error);
        return {
            valid: false,
            message: `Ошибка при проверке структуры папки: ${error.message}`
        };
    }
}

// Add global variable to track if a folder is selected
let selectedFolderPath = null;

// Get folders from the specified path
async function getFolders() {
    const folderListElement = document.getElementById('folderList');
    const refreshButton = document.getElementById('refreshFolders');
    
    // Add spinning animation to refresh button
    refreshButton.classList.add('spinning');
    
    // Reset selected folder and disable buttons when refreshing
    selectedFolderPath = null;
    updateButtonState();
    
    try {
        // Validate folder structure
        const validation = validateFolderStructure(FOLDER_PATH);
        
        if (!validation.valid) {
            folderListElement.innerHTML = `
                <div class="error-message">
                    ${validation.message}
                </div>
            `;
            return;
        }
        
        // Use the Events folder path
        const eventsPath = validation.eventsPath;
        
        // Read Events directory contents
        const items = fs.readdirSync(eventsPath);
        
        // Filter to only include directories and get their stats
        const folders = items
            .filter(item => {
                try {
                    return fs.statSync(path.join(eventsPath, item)).isDirectory();
                } catch (err) {
                    console.error(`Error checking if ${item} is directory:`, err);
                    return false;
                }
            })
            .map(folder => {
                try {
                    const stats = fs.statSync(path.join(eventsPath, folder));
                    return {
                        name: folder,
                        createdAt: stats.birthtime || stats.mtime, // Use mtime as fallback
                        path: path.join(eventsPath, folder)
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
                    Папка Events пуста. Создайте папку мероприятия.
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
                    console.log('Selected event folder:', folderPath);
                    
                    // Store the selected folder path
                    selectedFolderPath = folderPath;
                    
                    // Send the selected folder to main process
                    ipcRenderer.send('selected-folder', folderPath);
                    
                    // Verify the path was set correctly
                    setTimeout(() => {
                        const verifiedPath = ipcRenderer.sendSync('get-selected-folder');
                        console.log('Verified selected folder in main process:', verifiedPath);
                    }, 100);
                    
                    // Highlight selected folder
                    document.querySelectorAll('.folder-item').forEach(f => 
                        f.classList.remove('selected'));
                    item.classList.add('selected');
                    
                    // Enable the buttons after selection
                    updateButtonState();
                });
            });
        }
    } catch (error) {
        console.error('Error reading folders:', error);
        folderListElement.innerHTML = `
            <div class="error-message">
                Ошибка чтения папок: ${error.message}
            </div>
        `;
    } finally {
        // Remove spinning animation after loading is complete
        setTimeout(() => {
            refreshButton.classList.remove('spinning');
        }, 500); // Give at least 500ms of animation for better UX
    }
}

// Function to update button state based on folder selection
function updateButtonState() {
    const openMainButton = document.getElementById('openMainWindow');
    const openEmptyButton = document.getElementById('openEmptyWindow');
    
    if (selectedFolderPath) {
        openMainButton.disabled = false;
        openEmptyButton.disabled = false;
        openMainButton.classList.remove('disabled');
        openEmptyButton.classList.remove('disabled');
    } else {
        openMainButton.disabled = true;
        openEmptyButton.disabled = true;
        openMainButton.classList.add('disabled');
        openEmptyButton.classList.add('disabled');
    }
}

// Set up button event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load folders
    getFolders();
    
    // Initialize buttons as disabled
    updateButtonState();
    
    // Add refresh button functionality
    const refreshButton = document.getElementById('refreshFolders');
    refreshButton.addEventListener('click', getFolders);
    
    // Add button functionalities
    document.getElementById('openMainWindow').addEventListener('click', () => {
        if (selectedFolderPath) {
            console.log('Opening main window with folder:', selectedFolderPath);
            ipcRenderer.send('open-main-window', selectedFolderPath);
        }
    });
    
    document.getElementById('openEmptyWindow').addEventListener('click', () => {
        if (selectedFolderPath) {
            console.log('Opening empty window with folder:', selectedFolderPath);
            ipcRenderer.send('open-empty-window', selectedFolderPath);
        }
    });
    
    document.getElementById('closeApp').addEventListener('click', () => {
        ipcRenderer.send('close-app');
    });
});
