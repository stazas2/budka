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

      // Add click event to folder items and buttons
      document.querySelectorAll(".folder-item").forEach((item) => {
        item.addEventListener("click", (event) => {
          // Ignore clicks on the buttons
          if (event.target.closest('.delete-event-button') || event.target.closest('.edit-event-button')) {
            return;
          }
          
          const folderPath = item.getAttribute("data-path")
          console.log("Selected event folder:", folderPath)

          // Store the selected folder path
          selectedFolderPath = folderPath

          // Send the selected folder to main process
          ipcRenderer.send("selected-folder", folderPath)

          // Close any currently open windows related to previous selections
          ipcRenderer.send('reload-open-windows', folderPath);

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

      // Add edit button functionality
      document.querySelectorAll(".edit-event-button").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.stopPropagation(); // Prevent folder selection
          const folderItem = button.closest('.folder-item');
          const folderPath = folderItem.getAttribute("data-path");
          const folderName = folderItem.getAttribute("data-name");
          
          openConfigEditor(folderPath, folderName);
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
          dateError.textContent = ''; // Clear error message
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
      dateError.textContent = ''; // Clear error message
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

// Function to open config editor
function openConfigEditor(folderPath, folderName) {
  const configEditorModal = document.getElementById('configEditorModal');
  const configEditorBody = document.getElementById('configEditorBody');
  
  // Set event name in the modal header
  document.getElementById('configEventName').textContent = folderName;
  
  // Show loading state
  configEditorBody.innerHTML = '<div class="loading">Загрузка конфигурации...</div>';
  
  // Store the folder path for later use
  configEditorModal.setAttribute('data-path', folderPath);
  
  // Show the modal
  configEditorModal.style.display = 'flex';
  
  // Try to load the config file
  try {
    const configPath = path.join(folderPath, 'config.json');
    if (!fs.existsSync(configPath)) {
      configEditorBody.innerHTML = `
        <div class="config-error">
          Файл конфигурации не найден в папке мероприятия.
        </div>
      `;
      return;
    }
    
    // Read and parse the config file
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Generate form fields for config properties
    renderConfigEditor(configData, configEditorBody);
    
  } catch (error) {
    console.error('Ошибка при загрузке конфигурации:', error);
    configEditorBody.innerHTML = `
      <div class="config-error">
        Ошибка при загрузке конфигурации: ${error.message}
      </div>
    `;
  }
  
  // Set up event listeners if they haven't been set up
  if (!window.configEditorInitialized) {
    // Close button event
    const closeButton = document.getElementById('closeConfigEditor');
    closeButton.addEventListener('click', () => {
      configEditorModal.style.display = 'none';
    });
    
    // Save button event
    const saveButton = document.getElementById('saveConfigButton');
    saveButton.addEventListener('click', () => {
      saveConfig(configEditorModal);
    });
    
    // Cancel button event
    const cancelButton = document.getElementById('cancelConfigButton');
    cancelButton.addEventListener('click', () => {
      configEditorModal.style.display = 'none';
    });
    
    // Mark as initialized
    window.configEditorInitialized = true;
  }
}

// Function to render config editor form
function renderConfigEditor(configData, container) {
  // Clear container
  container.innerHTML = '';
  
  // Store original config for reference
  container.setAttribute('data-original-config', JSON.stringify(configData));
  
  // Create form for editing config
  Object.entries(configData).forEach(([key, value]) => {
    const propertyType = typeof value;
    const propertyContainer = document.createElement('div');
    propertyContainer.className = 'config-property';
    
    // Create property header
    const propertyHeader = document.createElement('div');
    propertyHeader.className = 'config-property-header';
    
    const propertyName = document.createElement('div');
    propertyName.className = 'config-property-name';
    propertyName.textContent = key;
    
    const propertyTypeSpan = document.createElement('div');
    propertyTypeSpan.className = 'config-property-type';
    propertyTypeSpan.textContent = propertyType;
    
    propertyHeader.appendChild(propertyName);
    propertyHeader.appendChild(propertyTypeSpan);
    propertyContainer.appendChild(propertyHeader);
    
    // Create input based on property type
    let input;
    
    if (propertyType === 'boolean') {
      // Create checkbox for boolean values
      input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = value;
      input.id = `config-${key}`;
      
      const label = document.createElement('label');
      label.htmlFor = input.id;
      label.textContent = value ? 'Включено' : 'Отключено';
      
      input.addEventListener('change', () => {
        label.textContent = input.checked ? 'Включено' : 'Отключено';
      });
      
      const wrapper = document.createElement('div');
      wrapper.appendChild(input);
      wrapper.appendChild(label);
      propertyContainer.appendChild(wrapper);
      
    } else if (propertyType === 'number') {
      // Create number input for numeric values
      input = document.createElement('input');
      input.type = 'number';
      input.value = value;
      propertyContainer.appendChild(input);
      
    } else if (propertyType === 'string') {
      // Create text input for string values
      input = document.createElement('input');
      input.type = 'text';
      input.value = value;
      propertyContainer.appendChild(input);
      
    } else if (propertyType === 'object' && value !== null) {
      // Handle array or object (display as JSON string)
      input = document.createElement('textarea');
      input.value = JSON.stringify(value, null, 2);
      input.style.width = '100%';
      input.style.minHeight = '100px';
      input.style.fontFamily = 'monospace';
      propertyContainer.appendChild(input);
      
    } else {
      // Fallback for other types
      input = document.createElement('input');
      input.type = 'text';
      input.value = String(value);
      propertyContainer.appendChild(input);
    }
    
    input.setAttribute('data-key', key);
    input.setAttribute('data-type', propertyType);
    
    container.appendChild(propertyContainer);
  });
}

// Function to save config
function saveConfig(modal) {
  const folderPath = modal.getAttribute('data-path');
  const configPath = path.join(folderPath, 'config.json');
  const configEditorBody = document.getElementById('configEditorBody');
  
  try {
    // Get original config
    const originalConfig = JSON.parse(configEditorBody.getAttribute('data-original-config'));
    const updatedConfig = {...originalConfig};
    
    // Collect values from all inputs
    configEditorBody.querySelectorAll('input, textarea').forEach(input => {
      const key = input.getAttribute('data-key');
      const type = input.getAttribute('data-type');
      
      if (!key) return;
      
      let value;
      
      if (type === 'boolean') {
        value = input.checked;
      } else if (type === 'number') {
        value = Number(input.value);
      } else if (type === 'object') {
        try {
          value = JSON.parse(input.value);
        } catch (e) {
          console.error(`Ошибка при разборе JSON для поля ${key}:`, e);
          value = originalConfig[key]; // Keep original on error
        }
      } else {
        value = input.value;
      }
      
      updatedConfig[key] = value;
    });
    
    // Write the updated config back to the file
    fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2), 'utf8');
    
    // Show success notification
    showNotification(`Конфигурация успешно сохранена`, 'success');
    
    // Close the modal
    modal.style.display = 'none';
    
  } catch (error) {
    console.error('Ошибка при сохранении конфигурации:', error);
    showNotification(`Ошибка при сохранении конфигурации: ${error.message}`, 'error');
  }
}

// Mock data for authentication (this would come from a server in a real implementation)
const VALID_AUTH_KEY = "PHOTO-BOOTH-AUTH-12345";

// Function to handle authorization modal
function initAuthModal() {
  const authButton = document.getElementById('authButton');
  const authModal = document.getElementById('authModal');
  const closeAuthModal = document.getElementById('closeAuthModal');
  const validateKeyButton = document.getElementById('validateKeyButton');
  const authKeyInput = document.getElementById('authKeyInput');
  const cameraStatus = document.getElementById('cameraStatus');
  const cameraView = document.getElementById('cameraView');
  
  // For demonstration purposes, create a simple QR code-like element
  const qrDisplay = document.getElementById('qrDisplay');
  qrDisplay.innerHTML = ''; // Clear placeholder
  
  // Create a mock QR code (just for UI representation)
  const mockQrCode = document.createElement('div');
  mockQrCode.style.width = '150px';
  mockQrCode.style.height = '150px';
  mockQrCode.style.background = 'repeating-linear-gradient(45deg, #333, #333 10px, #fff 10px, #fff 20px)';
  mockQrCode.style.border = '8px solid white';
  mockQrCode.style.boxShadow = '0 0 0 1px #ccc';
  qrDisplay.appendChild(mockQrCode);
  
  // Open auth modal when clicking the auth button
  authButton.addEventListener('click', () => {
    authModal.style.display = 'flex';
    authKeyInput.value = ''; // Clear input field
    cameraStatus.textContent = 'Включение камеры...';
    cameraStatus.style.color = '#666';
    
    // Start the real camera
    startRealCamera();
  });
  
  // Close auth modal
  closeAuthModal.addEventListener('click', () => {
    authModal.style.display = 'none';
    stopRealCamera();
  });
  
  // Validate key button click
  validateKeyButton.addEventListener('click', () => {
    validateAuthKey(authKeyInput.value.trim());
  });
  
  // Also validate on Enter key
  authKeyInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
      validateAuthKey(authKeyInput.value.trim());
    }
  });
}

// Function to validate authentication key
function validateAuthKey(key) {
  const cameraStatus = document.getElementById('cameraStatus');
  
  if (!key) {
    cameraStatus.textContent = 'Ошибка: Введите ключ авторизации';
    cameraStatus.style.color = '#e53935';
    return;
  }
  
  // Compare with valid key
  if (key === VALID_AUTH_KEY) {
    cameraStatus.textContent = 'Авторизация успешна!';
    cameraStatus.style.color = '#43a047';
    
    // Show success notification
    showNotification('Авторизация прошла успешно!', 'success');
    
    // Close modal after short delay
    setTimeout(() => {
      document.getElementById('authModal').style.display = 'none';
      stopRealCamera();
    }, 1500);
  } else {
    cameraStatus.textContent = 'Неверный ключ авторизации';
    cameraStatus.style.color = '#e53935';
    showNotification('Ошибка авторизации: неверный ключ', 'error');
  }
}

// Variables for real camera functionality
let videoStream = null;
let videoElement = null;
let canvasElement = null;
let scanning = false;
let scanInterval = null;

// Start real camera
function startRealCamera() {
  const cameraView = document.getElementById('cameraView');
  const cameraStatus = document.getElementById('cameraStatus');
  
  // Clear the camera view
  cameraView.innerHTML = '';
  
  // Create video element
  videoElement = document.createElement('video');
  videoElement.style.width = '100%';
  videoElement.style.height = '100%';
  videoElement.style.objectFit = 'cover';
  cameraView.appendChild(videoElement);
  
  // Create canvas for QR scanning (hidden)
  canvasElement = document.createElement('canvas');
  canvasElement.style.display = 'none';
  cameraView.appendChild(canvasElement);
  
  // Request camera access
  navigator.mediaDevices.getUserMedia({ 
    video: { 
      facingMode: 'environment',  // Prefer back camera if available
      width: { ideal: 1280 },
      height: { ideal: 720 }
    } 
  })
  .then(function(stream) {
    videoStream = stream;
    videoElement.srcObject = stream;
    videoElement.setAttribute('playsinline', true); // Required for iOS
    videoElement.play();
    
    cameraStatus.textContent = 'Камера активна. Наведите на QR-код или введите ключ вручную.';
    
    // Start QR code scanning
    startQRScanning();
  })
  .catch(function(error) {
    console.error('Ошибка доступа к камере:', error);
    cameraStatus.textContent = 'Ошибка доступа к камере. Используйте ручной ввод ключа.';
    cameraStatus.style.color = '#e53935';
  });
}

// Stop real camera
function stopRealCamera() {
  if (scanning) {
    scanning = false;
    clearInterval(scanInterval);
  }
  
  if (videoStream) {
    videoStream.getTracks().forEach(track => {
      track.stop();
    });
    videoStream = null;
  }
  
  videoElement = null;
  canvasElement = null;
}

// Start QR code scanning
function startQRScanning() {
  if (!videoElement || !canvasElement) return;
  
  // Configure canvas
  const canvas = canvasElement;
  const ctx = canvas.getContext('2d');
  
  // Set scanning flag
  scanning = true;
  
  // Function to scan for QR codes
  const scanQRCode = () => {
    if (!scanning || !videoElement || !videoElement.videoWidth) return;
    
    // Set canvas dimensions to match video
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    // Draw current video frame to canvas
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    try {
      // Get image data from canvas
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Use jsQR library to find QR codes in the image
      if (typeof jsQR === 'function') { // Check if jsQR is available
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        
        if (code) {
          // QR code found
          console.log("QR код обнаружен:", code.data);
          
          // Update input field with the QR code data
          const authKeyInput = document.getElementById('authKeyInput');
          authKeyInput.value = code.data;
          
          // Validate the key
          validateAuthKey(code.data);
          
          // Pause scanning for a moment to prevent multiple detections
          scanning = false;
          setTimeout(() => {
            if (videoElement) scanning = true;
          }, 2000);
        }
      } else {
        console.warn('jsQR library not loaded. QR scanning unavailable.');
        const cameraStatus = document.getElementById('cameraStatus');
        cameraStatus.textContent = 'Библиотека QR не загружена. Используйте ручной ввод.';
      }
    } catch (error) {
      console.error('Error scanning QR code:', error);
    }
  };
  
  // Run the scan every 200ms
  scanInterval = setInterval(scanQRCode, 200);
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

  // Initialize the authorization modal
  initAuthModal();
  
  // Load jsQR library dynamically
  loadJsQR();
});

// Function to dynamically load jsQR library
function loadJsQR() {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
  script.onload = () => {
    console.log('jsQR library loaded successfully');
  };
  script.onerror = () => {
    console.error('Failed to load jsQR library');
  };
  document.body.appendChild(script);
}
