const { ipcRenderer } = require("electron")
const fs = require("fs")
const path = require("path")
const { config } = require("process")
const { loadConfig } = require("./utils/configLoader")

// Load initial config - without a selected folder path
const initialConfig = loadConfig()

// Folder path to scan - use configured path or fallback
const FOLDER_PATH = initialConfig.globalFolderPath || "C:\\temp"

// Function to format date
function formatDate(date) {
  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }
  return date.toLocaleDateString("en-US", options)
}

// Check if the folder structure is valid
function validateFolderStructure(basePath) {
  try {
    // Check if the base path exists
    if (!fs.existsSync(basePath)) {
      return {
        valid: false,
        message: `Директория ${basePath} не существует`,
      }
    }

    // Get all items in the base directory
    const items = fs.readdirSync(basePath)

    // Check for required files (.exe, .json)
    const hasExeFile = items.some((item) => {
      return (
        item.endsWith(".exe") && fs.statSync(path.join(basePath, item)).isFile()
      )
    })

    const hasJsonFile = items.some((item) => {
      return (
        item.endsWith(".json") &&
        fs.statSync(path.join(basePath, item)).isFile()
      )
    })

    // Check for UserFolder directory
    const userFolderPath = path.join(basePath, "UserFolder")
    const hasUserFolder =
      fs.existsSync(userFolderPath) && fs.statSync(userFolderPath).isDirectory()

    // Check for Events directory inside UserFolder
    const eventsPath = path.join(userFolderPath, "Events")
    const hasEventsFolder =
      hasUserFolder &&
      fs.existsSync(eventsPath) &&
      fs.statSync(eventsPath).isDirectory()

    // Build validation result
    const missingItems = []
    if (!hasExeFile) missingItems.push("*.exe файл")
    if (!hasJsonFile) missingItems.push("*.json файл")
    if (!hasUserFolder) missingItems.push("папка 'UserFolder'")
    else if (!hasEventsFolder)
      missingItems.push("папка 'Events' внутри 'UserFolder'")

    if (missingItems.length > 0) {
      return {
        valid: false,
        message: `Некорректная структура папки. Отсутствуют: ${missingItems.join(
          ", "
        )}`,
      }
    }

    return {
      valid: true,
      eventsPath: eventsPath,
    }
  } catch (error) {
    console.error("Ошибка при проверке структуры папки:", error)
    return {
      valid: false,
      message: `Ошибка при проверке структуры папки: ${error.message}`,
    }
  }
}

// Add global variable to track if a folder is selected
let selectedFolderPath = null
let eventsBasePath = null

// Get folders from the specified path
async function getFolders() {
  const folderListElement = document.getElementById("folderList")
  const refreshButton = document.getElementById("refreshFolders")
  const createEventButton = document.getElementById("createEvent")

  // Add spinning animation to refresh button
  refreshButton.classList.add("spinning")

  // Reset selected folder and disable buttons when refreshing
  selectedFolderPath = null
  updateButtonState()

  try {
    // Validate folder structure
    const validation = validateFolderStructure(FOLDER_PATH)

    if (!validation.valid) {
      folderListElement.innerHTML = `
                <div class="error-message">
                    ${validation.message}
                </div>
            `
      // Disable create event button if structure is invalid
      createEventButton.disabled = true
      createEventButton.classList.add("disabled")
      return
    }

    // Enable create event button if structure is valid
    createEventButton.disabled = false
    createEventButton.classList.remove("disabled")

    // Use the Events folder path
    eventsBasePath = validation.eventsPath

    // Read Events directory contents
    const items = fs.readdirSync(eventsBasePath)

    // Filter to only include directories and get their stats
    const folders = items
      .filter((item) => {
        try {
          // Exclude 'default' folder
          if (item === "default") return false
          
          return fs.statSync(path.join(eventsBasePath, item)).isDirectory()
        } catch (err) {
          console.error(`Error checking if ${item} is directory:`, err)
          return false
        }
      })
      .map((folder) => {
        try {
          const stats = fs.statSync(path.join(eventsBasePath, folder))
          return {
            name: folder,
            createdAt: stats.birthtime || stats.mtime, // Use mtime as fallback
            path: path.join(eventsBasePath, folder),
          }
        } catch (err) {
          console.error(`Error getting stats for ${folder}:`, err)
          return null
        }
      })
      .filter((folder) => folder !== null)
      // Sort by creation date, newest first
      .sort((a, b) => b.createdAt - a.createdAt)

    // Display folders or "no folders" message
    if (folders.length === 0) {
      folderListElement.innerHTML = `
                <div class="empty-message">
                    Папка Events пуста. Создайте папку мероприятия.
                </div>
            `
    } else {
      // Clear existing folder list
      folderListElement.innerHTML = '';
      
      // Get the template
      const template = document.getElementById('folder-item-template');
      
      // Create a document fragment to improve performance
      const fragment = document.createDocumentFragment();
      
      // Create folder items using the template
      folders.forEach(folder => {
        // Split folder name into date and event name parts
        const nameParts = folder.name.split('_');
        const dateStr = nameParts[0] || '';
        const eventName = nameParts.slice(1).join('_') || folder.name;
        
        // Clone the template content
        const folderItem = template.content.cloneNode(true).querySelector('.folder-item');
        
        // Set data attributes
        folderItem.setAttribute('data-path', folder.path);
        folderItem.setAttribute('data-name', folder.name);
        
        // Fill in the content
        folderItem.querySelector('.folder-name').textContent = eventName;
        folderItem.querySelector('.folder-date').textContent = dateStr;
        
        // Add to fragment
        fragment.appendChild(folderItem);
      });
      
      // Add all items to the DOM at once
      folderListElement.appendChild(fragment);

      // Add click event to folder items
      document.querySelectorAll(".folder-item").forEach((item) => {
        item.addEventListener("click", (event) => {
          // Ignore clicks on the delete button
          if (event.target.closest('.delete-event-button')) {
            return;
          }
          
          const folderPath = item.getAttribute("data-path")
          console.log("Selected event folder:", folderPath)

          // Store the selected folder path
          selectedFolderPath = folderPath

          // Send the selected folder to main process
          ipcRenderer.send("selected-folder", folderPath)

          // Verify the path was set correctly
          setTimeout(() => {
            const verifiedPath = ipcRenderer.sendSync("get-selected-folder")
            console.log(
              "Verified selected folder in main process:",
              verifiedPath
            )
          }, 100)

          // Highlight selected folder
          document
            .querySelectorAll(".folder-item")
            .forEach((f) => f.classList.remove("selected"))
          item.classList.add("selected")

          // Enable the buttons after selection
          updateButtonState()
        })
      })

      // Add delete button functionality
      document.querySelectorAll(".delete-event-button").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.stopPropagation(); // Prevent folder selection
          const folderItem = button.closest('.folder-item');
          const folderPath = folderItem.getAttribute("data-path");
          const folderName = folderItem.getAttribute("data-name");
          
          showDeleteConfirmation(folderPath, folderName);
        });
      });
    }
  } catch (error) {
    console.error("Error reading folders:", error)
    folderListElement.innerHTML = `
            <div class="error-message">
                Ошибка чтения папок: ${error.message}
            </div>
        `
  } finally {
    // Remove spinning animation after loading is complete
    setTimeout(() => {
      refreshButton.classList.remove("spinning")
    }, 500) // Give at least 500ms of animation for better UX
  }
}

// Function to update button state based on folder selection
function updateButtonState() {
  const openMainButton = document.getElementById("openMainWindow")
  const openEmptyButton = document.getElementById("openEmptyWindow")

  if (selectedFolderPath) {
    openMainButton.disabled = false
    openEmptyButton.disabled = false
    openMainButton.classList.remove("disabled")
    openEmptyButton.classList.remove("disabled")
  } else {
    openMainButton.disabled = true
    openEmptyButton.disabled = true
    openMainButton.classList.add("disabled")
    openEmptyButton.classList.add("disabled")
  }
}

// Function to create a new event folder
function createEventFolder(eventDate, eventName) {
  if (!eventsBasePath) {
    showNotification('Ошибка: путь к папке мероприятий не найден.', 'error');
    return false;
  }

  try {
    // Format folder name as DD.MM.YYYY_EventName
    const folderName = `${eventDate}_${eventName}`;
    const eventFolderPath = path.join(eventsBasePath, folderName);
    
    // Check if folder already exists
    if (fs.existsSync(eventFolderPath)) {
      showNotification('Папка с таким именем уже существует!', 'error');
      return false;
    }

    // Create the event folder
    fs.mkdirSync(eventFolderPath, { recursive: true });
    
    // Check for default folder existence
    const defaultFolderPath = path.join(eventsBasePath, 'default');
    if (fs.existsSync(defaultFolderPath)) {
      // Copy contents from default folder to new event folder
      copyFolderContents(defaultFolderPath, eventFolderPath);
    }
    
    showNotification(`Мероприятие "${folderName}" успешно создано!`, 'success');
    
    // Refresh folder list
    getFolders();
    
    return true;
  } catch (error) {
    console.error('Ошибка при создании мероприятия:', error);
    showNotification(`Ошибка при создании мероприятия: ${error.message}`, 'error');
    return false;
  }
}

// Function to copy folder contents recursively
function copyFolderContents(sourceFolderPath, targetFolderPath) {
  if (!fs.existsSync(sourceFolderPath)) {
    console.warn('Папка-источник не существует:', sourceFolderPath);
    return;
  }
  
  if (!fs.existsSync(targetFolderPath)) {
    fs.mkdirSync(targetFolderPath, { recursive: true });
  }
  
  const items = fs.readdirSync(sourceFolderPath);
  
  items.forEach(item => {
    const sourcePath = path.join(sourceFolderPath, item);
    const targetPath = path.join(targetFolderPath, item);
    
    const stats = fs.statSync(sourcePath);
    
    if (stats.isDirectory()) {
      // Create directory and copy its contents recursively
      fs.mkdirSync(targetPath, { recursive: true });
      copyFolderContents(sourcePath, targetPath);
    } else {
      // Copy file
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}

// Function to show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Show notification with animation
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Hide and remove after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// Function to validate date format (DD.MM.YYYY)
function isValidDate(dateStr) {
  // Regular expression for DD.MM.YYYY format
  const regex = /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.\d{4}$/;
  
  if (!regex.test(dateStr)) {
    return false;
  }
  
  // Further validate the date (e.g., check for 31.02.2023)
  const parts = dateStr.split('.');
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // JS months are 0-based
  const year = parseInt(parts[2], 10);
  
  const date = new Date(year, month, day);
  
  return date.getDate() === day && 
         date.getMonth() === month && 
         date.getFullYear() === year;
}

// Initialize datepicker for the event date field
function initDatePicker() {
  const dateInput = document.getElementById('eventDate');
  const calendarToggle = document.getElementById('calendarToggle');
  
  if (!dateInput || !calendarToggle) return;
  
  // Initialize our custom SimpleDatePicker
  const datePicker = new SimpleDatePicker(dateInput, {
    onSelect: function(date, dateStr) {
      // Update the input field with the selected date
      dateInput.value = dateStr;
      
      // Trigger validation
      const dateError = document.getElementById('eventDateError');
      if (dateError) {
        if (!dateStr) {
          dateError.textContent = 'Введите дату мероприятия';
        } else if (!isValidDate(dateStr)) {
          dateError.textContent = 'Неверный формат даты. Используйте ДД.ММ.ГГГГ';
        } else {
          dateError.textContent = '';
        }
      }
    }
  });
  
  // Toggle calendar when clicking the calendar button
  calendarToggle.addEventListener('click', function() {
    datePicker.toggle();
  });
  
  // Reset the error message when the user starts typing
  dateInput.addEventListener('input', function() {
    const dateError = document.getElementById('eventDateError');
    if (dateError) {
      dateError.textContent = '';
    }
  });

  // Store reference to datePicker in window object to prevent garbage collection
  window.currentDatePicker = datePicker;
}

// Function to show event creation modal
function showEventModal() {
  const modal = document.getElementById('createEventModal');
  
  // Reset form
  document.getElementById('eventDate').value = '';
  document.getElementById('eventName').value = '';
  document.getElementById('eventDateError').textContent = '';
  document.getElementById('eventNameError').textContent = '';
  
  // Show modal
  modal.style.display = 'flex';
  
  // Set up event listeners if they haven't been set up
  if (!window.eventModalInitialized) {
    // Close button event
    const closeButton = modal.querySelector('.close-modal');
    closeButton.addEventListener('click', () => {
      modal.style.display = 'none';
    });
    
    // Create event button
    const createEventButton = document.getElementById('createEventButton');
    createEventButton.addEventListener('click', () => {
      const dateInput = document.getElementById('eventDate');
      const nameInput = document.getElementById('eventName');
      const dateError = document.getElementById('eventDateError');
      const nameError = document.getElementById('eventNameError');
      
      const eventDate = dateInput.value.trim();
      const eventName = nameInput.value.trim();
      
      // Clear previous errors
      dateError.textContent = '';
      nameError.textContent = '';
      
      // Validate inputs
      let isValid = true;
      
      if (!eventDate) {
        dateError.textContent = 'Введите дату мероприятия';
        isValid = false;
      } else if (!isValidDate(eventDate)) {
        dateError.textContent = 'Неверный формат даты. Используйте ДД.ММ.ГГГГ';
        isValid = false;
      }
      
      if (!eventName) {
        nameError.textContent = 'Введите название мероприятия';
        isValid = false;
      } else if (eventName.includes('/') || eventName.includes('\\') || eventName.includes(':') || 
                 eventName.includes('*') || eventName.includes('?') || eventName.includes('"') ||
                 eventName.includes('<') || eventName.includes('>') || eventName.includes('|')) {
        nameError.textContent = 'Название содержит недопустимые символы';
        isValid = false;
      }
      
      if (isValid) {
        const success = createEventFolder(eventDate, eventName);
        if (success) {
          modal.style.display = 'none';
        }
      }
    });
    
    // Cancel button
    const cancelEventButton = document.getElementById('cancelEventButton');
    cancelEventButton.addEventListener('click', () => {
      modal.style.display = 'none';
    });
    
    // Initialize date picker
    initDatePicker();
    
    // Mark as initialized
    window.eventModalInitialized = true;
  }
}

// Function to show delete confirmation modal
function showDeleteConfirmation(folderPath, folderName) {
  const confirmModal = document.getElementById('deleteConfirmModal');
  
  // Set the folder name in the confirmation message
  document.getElementById('eventToDelete').textContent = folderName;
  
  // Show the confirmation modal
  confirmModal.style.display = 'flex';
  
  // Store the folder info for deletion
  confirmModal.setAttribute('data-path', folderPath);
  confirmModal.setAttribute('data-name', folderName);
  
  // Set up event listeners if they haven't been set up
  if (!window.deleteModalInitialized) {
    // Handle confirm button
    const confirmButton = document.getElementById('confirmDeleteButton');
    confirmButton.addEventListener('click', () => {
      const path = confirmModal.getAttribute('data-path');
      const name = confirmModal.getAttribute('data-name');
      deleteEventFolder(path, name);
      confirmModal.style.display = 'none';
    });
    
    // Handle cancel button
    const cancelButton = document.getElementById('cancelDeleteButton');
    cancelButton.addEventListener('click', () => {
      confirmModal.style.display = 'none';
    });
    
    // Mark as initialized
    window.deleteModalInitialized = true;
  }
}

// Function to delete event folder
function deleteEventFolder(folderPath, folderName) {
  try {
    if (!fs.existsSync(folderPath)) {
      showNotification('Папка мероприятия не найдена.', 'error');
      return;
    }
    
    // If this is the selected folder, deselect it
    if (selectedFolderPath === folderPath) {
      selectedFolderPath = null;
      updateButtonState();
      // Notify main process that no folder is selected
      ipcRenderer.send("selected-folder", null);
    }
    
    // Delete the folder and its contents
    deleteFolderRecursive(folderPath);
    
    // Show success notification
    showNotification(`Мероприятие "${folderName}" успешно удалено!`, 'success');
    
    // Refresh folder list
    getFolders();
    
  } catch (error) {
    console.error('Ошибка при удалении мероприятия:', error);
    showNotification(`Ошибка при удалении мероприятия: ${error.message}`, 'error');
  }
}

// Function to delete folder and its contents recursively
function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // Recursive call for directories
        deleteFolderRecursive(curPath);
      } else {
        // Delete file
        fs.unlinkSync(curPath);
      }
    });
    
    // Delete the empty directory
    fs.rmdirSync(folderPath);
  }
}

// Set up button event listeners
document.addEventListener("DOMContentLoaded", () => {
  // Load folders
  getFolders()

  // Initialize buttons as disabled
  updateButtonState()

  // Add refresh button functionality
  const refreshButton = document.getElementById("refreshFolders")
  refreshButton.addEventListener("click", getFolders)

  // Add create event button functionality
  const createEventButton = document.getElementById("createEvent")
  if (createEventButton) {
    createEventButton.addEventListener("click", showEventModal)
  }

  // Add button functionalities
  document.getElementById("openMainWindow").addEventListener("click", () => {
    if (selectedFolderPath) {
      console.log("Opening main window with folder:", selectedFolderPath)
      ipcRenderer.send("open-main-window", selectedFolderPath)
    }
  })

  document.getElementById("openEmptyWindow").addEventListener("click", () => {
    if (selectedFolderPath) {
      console.log("Opening empty window with folder:", selectedFolderPath)
      ipcRenderer.send("open-empty-window", selectedFolderPath)
    }
  })

  document.getElementById("closeApp").addEventListener("click", () => {
    ipcRenderer.send("close-app")
  })
})
