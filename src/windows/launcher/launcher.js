const IpcRendererService = require("../../renderer/services/IpcRendererService")

const NotificationManager = require("../../renderer/components/Notification")

let FOLDER_PATH = "C:\\temp"

;(async () => {
  try {
    const config = await IpcRendererService.getConfig()
    FOLDER_PATH = config.globalFolderPath || "C:\\temp"
  } catch (e) {
    console.error("Failed to load config:", e)
  }
})()

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
async function validateFolderStructure(basePath) {
  try {
    const response = await IpcRendererService.invoke(window.IpcChannels.VALIDATE_FOLDER_STRUCTURE, {
      basePath
    });

    if (response.success) {
      return response.result;
    } else {
      console.error("Folder validation error:", response.error);
      return {
        valid: false,
        message: response.error || "Unknown error during folder validation"
      };
    }
  } catch (error) {
    console.error("Ошибка при проверке структуры папки:", error);
    return {
      valid: false,
      message: `Ошибка при проверке структуры папки: ${error.message}`
    };
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

    const response = await IpcRendererService.invoke(IpcChannels.LIST_EVENT_FOLDERS, {
      basePath: eventsBasePath
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    const folders = response.folders.sort((a, b) => b.createdAt - a.createdAt);

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
      
      console.log('Event folders received:', folders);
      // Create folder items using the template
      folders.forEach(folder => {
        // Split folder name into date and event name parts
        const nameParts = folder.name.split('_');
        let dateStr = nameParts[0];
        const eventName = nameParts.slice(1).join('_') || folder.name;

        // If no date prefix, fallback to folder creation date
        if (!dateStr || !/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
            const createdAt = folder.createdAt ? new Date(folder.createdAt) : null;
            dateStr = createdAt ? createdAt.toLocaleDateString('ru-RU') : '';
        }
        
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

          IpcRendererService.setSelectedFolder(folderPath)
          // IpcRendererService.reloadWindows(folderPath)  // Disabled to prevent app from closing

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
async function createEventFolder(eventDate, eventName) {
  if (!eventsBasePath) {
    NotificationManager.show('Ошибка: путь к папке мероприятий не найден.', 'error');
    return false;
  }

  try {
    const response = await IpcRendererService.invoke(IpcChannels.CREATE_EVENT_FOLDER, {
      basePath: eventsBasePath,
      eventDate,
      eventName
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    NotificationManager.show(`Мероприятие "${eventDate}_${eventName}" успешно создано!`, 'success');
    
    // Refresh folder list
    await getFolders();
    
    return true;
  } catch (error) {
    console.error('Ошибка при создании мероприятия:', error);
    NotificationManager.show(`Ошибка при создании мероприятия: ${error.message}`, 'error');
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
async function deleteEventFolder(folderPath, folderName) {
  try {
    // Deselect if this was the selected folder
    if (selectedFolderPath === folderPath) {
      selectedFolderPath = null;
      updateButtonState();
      IpcRendererService.setSelectedFolder(null);
    }

    const response = await IpcRendererService.invoke(IpcChannels.DELETE_EVENT_FOLDER, {
      folderPath,
      folderName
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete event folder');
    }

    NotificationManager.show(`Мероприятие "${folderName}" успешно удалено!`, 'success');
    await getFolders();
  } catch (error) {
    console.error('Ошибка при удалении мероприятия:', error);
    NotificationManager.show(`Ошибка при удалении мероприятия: ${error.message}`, 'error');
  }
}

// Function to open config editor
async function openConfigEditor(folderPath, folderName) {
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
  
  try {
    const response = await IpcRendererService.invoke(IpcChannels.GET_EVENT_CONFIG, {
      folderPath
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to load event config');
    }

    // Generate form fields for config properties
    renderConfigEditor(response.config, configEditorBody);
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
async function saveConfig(modal) {
  const folderPath = modal.getAttribute('data-path');
  const configEditorBody = document.getElementById('configEditorBody');
  
  try {
    // Get original config (if needed, or just collect current values)
    const updatedConfig = {};
    
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
          // Decide how to handle parse errors - maybe keep original or set to null/empty
          value = {}; // Example: set to empty object on error
        }
      } else {
        value = input.value;
      }
      
      updatedConfig[key] = value;
    });
    
    // Save config through IPC
    const response = await IpcRendererService.invoke(IpcChannels.SAVE_EVENT_CONFIG, {
      folderPath,
      config: updatedConfig
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to save config');
    }
    
    NotificationManager.show(`Конфигурация успешно сохранена`, 'success');
    modal.style.display = 'none';
    
  } catch (error) {
    console.error('Ошибка при сохранении конфигурации:', error);
    NotificationManager.show(`Ошибка при сохранении конфигурации: ${error.message}`, 'error');
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
      IpcRendererService.openMainWindow(selectedFolderPath)
    }
  })

  document.getElementById("openEmptyWindow").addEventListener("click", () => {
    if (selectedFolderPath) {
      console.log("Opening empty window with folder:", selectedFolderPath)
      IpcRendererService.openConfiguratorWindow(selectedFolderPath)
    }
  })

  document.getElementById("closeApp").addEventListener("click", () => {
    IpcRendererService.closeApp()
  })
})
