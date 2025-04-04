const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Global variable to store current folder path
let currentFolderPath = null;

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
        // If we're in the interface tab, save settings before opening
        if (document.querySelector('[data-tab="tab2"]').classList.contains('active')) {
            openPhotoboothWithCurrentSettings();
        } else {
            // Original behavior for other tabs
            const folderPath = ipcRenderer.sendSync('get-selected-folder');
            ipcRenderer.send('switch-to-photobooth', folderPath);
        }
    });

    // Get the current folder path
    currentFolderPath = ipcRenderer.sendSync('get-selected-folder');
    
    // Load config file when opening the interface tab
    document.querySelector('[data-tab="tab2"]').addEventListener('click', () => {
        loadConfigSettings();
    });

    // Load config settings initially if interface tab is active by default
    if (document.querySelector('[data-tab="tab2"]').classList.contains('active')) {
        loadConfigSettings();
    }

    // Add event listener for the save config button
    const saveConfigButton = document.getElementById('save-config');
    if (saveConfigButton) {
        saveConfigButton.addEventListener('click', saveConfigSettings);
    }
    
    // Load branding settings when tab3 is clicked
    document.querySelector('[data-tab="tab3"]').addEventListener('click', () => {
        if (!currentFolderPath) return;
        
        try {
            const configPath = path.join(currentFolderPath, 'config.json');
            if (fs.existsSync(configPath)) {
                const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                loadBrandingSettings(configData);
            }
        } catch (error) {
            console.error('Error loading branding config:', error);
        }
    });

    // Load print settings when tab4 is clicked
    document.querySelector('[data-tab="tab4"]').addEventListener('click', async () => {
        if (!currentFolderPath) return;
        
        try {
            const configPath = path.join(currentFolderPath, 'config.json');
            if (fs.existsSync(configPath)) {
                const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                
                // Load printers first, then load print settings
                await loadAvailablePrinters();
                loadPrintSettings(configData);
            }
        } catch (error) {
            console.error('Error loading print config:', error);
        }
    });
    
    // Load camera settings when tab5 is clicked
    document.querySelector('[data-tab="tab5"]').addEventListener('click', async () => {
        if (!currentFolderPath) return;
        
        try {
            // Load both global config and event config
            const globalConfig = await loadGlobalConfig();
            
            const configPath = path.join(currentFolderPath, 'config.json');
            if (fs.existsSync(configPath)) {
                const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                loadCameraSettings(configData, globalConfig);
            }
        } catch (error) {
            console.error('Error loading camera config:', error);
        }
    });
    
    // Add event listener for the save camera config button
    const saveCameraButton = document.getElementById('save-camera-config');
    if (saveCameraButton) {
        saveCameraButton.addEventListener('click', saveCameraSettings);
    }
    
    // Remove the event listener for opening the Canon utility
    
    // Add event listener to toggle Canon settings visibility based on camera mode
    const cameraModeSelect = document.getElementById('cameraMode');
    if (cameraModeSelect) {
        cameraModeSelect.addEventListener('change', () => {
            const canonSettings = document.getElementById('canon-settings');
            
            if (cameraModeSelect.value === 'canon') {
                canonSettings.style.display = 'block';
            } else {
                canonSettings.style.display = 'none';
            }
        });
    }
    
    // File selection buttons - updated to use the new approach
    // todo
    // 'selectHotFolder': 'hotFolderPath'
    const fileSelectors = {
        'selectLogo': 'logoPath',
        'selectBrandLogo': 'brandLogoPath',
        'selectLightBgImage': 'lightBackgroundImage',
        'selectDarkBgImage': 'darkBackgroundImage'
    };
    
    Object.entries(fileSelectors).forEach(([buttonId, inputId]) => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', () => {
                // Use sendSync instead of invoke for file dialog
                const result = ipcRenderer.sendSync('select-file', {
                    title: 'Выберите изображение',
                    filters: [
                        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] }
                    ],
                    properties: ['openFile']
                });
                
                if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
                    document.getElementById(inputId).value = result.filePaths[0];
                }
            });
        }
    });
    
    // Add separate folder selection for hot folder
    const hotFolderButton = document.getElementById('selectHotFolder');
    if (hotFolderButton) {
        hotFolderButton.addEventListener('click', () => {
            // Use special directory selection dialog
            const result = ipcRenderer.sendSync('select-file', {
                title: 'Выберите горячую папку',
                properties: ['openDirectory']
            });
            
            if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
                document.getElementById('hotFolderPath').value = result.filePaths[0];
            }
        });
    }
    
    // Connect color pickers to their text inputs
    const colorPickers = {
        'lightBackgroundColorPicker': 'lightBackgroundColor',
        'lightTextColorPicker': 'lightTextColor',
        'darkBackgroundColorPicker': 'darkBackgroundColor',
        'darkTextColorPicker': 'darkTextColor'
    };
    
    Object.entries(colorPickers).forEach(([pickerId, inputId]) => {
        const picker = document.getElementById(pickerId);
        const input = document.getElementById(inputId);
        
        if (picker && input) {
            // Update text input when color picker changes
            picker.addEventListener('input', () => {
                input.value = picker.value;
            });
            
            // Update color picker when text input changes
            input.addEventListener('input', () => {
                try {
                    picker.value = input.value;
                } catch (e) {
                    // Invalid color format in text input
                }
            });
        }
    });
    
    // Connect range slider to text input for blur
    const blurRange = document.getElementById('backdropBlurRange');
    const blurInput = document.getElementById('backdropBlur');
    
    if (blurRange && blurInput) {
        blurRange.addEventListener('input', () => {
            blurInput.value = blurRange.value + 'px';
        });
        
        blurInput.addEventListener('input', () => {
            const value = parseInt(blurInput.value);
            if (!isNaN(value)) {
                blurRange.value = value;
            }
        });
    }
    
    // Update gradient preview when input changes
    const bgInput = document.getElementById('animatedBackground');
    if (bgInput) {
        bgInput.addEventListener('input', updateGradientPreview);
    }
    
    // Add event listener for the save branding config button
    const saveBrandingButton = document.getElementById('save-branding-config');
    if (saveBrandingButton) {
        saveBrandingButton.addEventListener('click', saveConfigSettings);
    }

    // Add event listener for the save print config button
    const savePrintButton = document.getElementById('save-print-config');
    if (savePrintButton) {
        savePrintButton.addEventListener('click', saveConfigSettings);
    }

    // Camera preview functionality
    const cameraPreview = document.getElementById('camera-preview');
    const canonPreview = document.getElementById('canon-preview');
    const startCameraButton = document.getElementById('start-camera');
    const stopCameraButton = document.getElementById('stop-camera');
    const refreshCameraButton = document.getElementById('refresh-camera');
    const cameraLoading = document.getElementById('camera-loading');
    
    let stream = null;
    let canonPreviewInterval = null;
    
    // Start camera stream
    startCameraButton.addEventListener('click', () => {
        const cameraMode = document.getElementById('cameraMode').value;
        
        if (cameraMode === 'pc') {
            startWebcamPreview();
        } else if (cameraMode === 'canon') {
            // No longer starting Canon preview here
            showNotification('Предпросмотр доступен только для веб-камеры', 'info');
        }
    });
    
    // Stop camera stream
    stopCameraButton.addEventListener('click', () => {
        stopCameraPreview();
    });
    
    // Refresh camera stream
    refreshCameraButton.addEventListener('click', () => {
        stopCameraPreview();
        setTimeout(() => {
            startCameraButton.click();
        }, 500);
    });
    
    // Update preview when camera mode changes
    document.getElementById('cameraMode').addEventListener('change', () => {
        stopCameraPreview();
        const canonSettings = document.getElementById('canon-settings');
        const cameraMode = document.getElementById('cameraMode').value;
        
        if (cameraMode === 'canon') {
            canonSettings.style.display = 'block';
            // Disable camera preview buttons for Canon mode
            startCameraButton.disabled = false;
            document.getElementById('camera-preview-wrapper').classList.add('disabled');
        } else {
            canonSettings.style.display = 'none';
            document.getElementById('camera-preview-wrapper').classList.remove('disabled');
        }
    });
    
    // Start webcam preview for PC camera mode
    async function startWebcamPreview() {
        cameraLoading.style.display = 'flex';
        canonPreview.style.display = 'none';
        cameraPreview.style.display = 'block';
        
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            
            cameraPreview.srcObject = stream;
            startCameraButton.disabled = true;
            stopCameraButton.disabled = false;
            cameraLoading.style.display = 'none';
        } catch (err) {
            console.error('Error accessing webcam:', err);
            showNotification('Ошибка доступа к камере: ' + err.message, 'error');
            cameraLoading.style.display = 'none';
        }
    }
    
    // Stop camera preview - simplify to only handle webcam
    function stopCameraPreview() {
        // Stop webcam stream if active
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
            cameraPreview.srcObject = null;
        }
        
        // Reset UI
        startCameraButton.disabled = false;
        stopCameraButton.disabled = true;
        cameraLoading.style.display = 'none';
    }
    
    // Clean up when tab changes
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // If moving away from camera tab, stop the preview
            if (button.getAttribute('data-tab') !== 'tab5' && (stream || canonPreviewInterval)) {
                stopCameraPreview();
            }
        });
    });
});

// Function to load config settings
function loadConfigSettings() {
    if (!currentFolderPath) {
        showNotification('No event folder selected', 'error');
        return;
    }

    const configPath = path.join(currentFolderPath, 'config.json');
    
    try {
        if (!fs.existsSync(configPath)) {
            showNotification('Config file not found', 'error');
            return;
        }

        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // Update form fields with config values
        document.getElementById('prePhotoTimer').value = configData.prePhotoTimer || 3;
        
        // inactivityTimeout is in milliseconds in the config, convert to seconds for UI
        document.getElementById('inactivityTimeout').value = (configData.inactivityTimeout || 60000) / 1000;
        
        // Language settings
        if (configData.language) {
            document.getElementById('languageCurrent').value = configData.language.current || 'ru';
            document.getElementById('showLanguageSwitcher').checked = configData.language.showSwitcher || false;
        }
        
        // Boolean settings
        document.getElementById('showResultQrBtn').checked = configData.showResultQrBtn || false;
        document.getElementById('showStyleNames').checked = configData.showStyleNames || false;
        document.getElementById('visibilityAgree').checked = configData.visibilityAgree || false;
        document.getElementById('allowMultipleGenderSelection').checked = configData.allowMultipleGenderSelection || false;
        
        // Allowed genders - handle the nested array structure from config.json
        if (Array.isArray(configData.allowedGenders)) {
            // Flatten the array structure to check for gender values
            const flatGenders = configData.allowedGenders.flat();
            document.getElementById('genderMale').checked = flatGenders.includes('man');
            document.getElementById('genderFemale').checked = flatGenders.includes('woman');
            
            // Also check for child genders
            document.getElementById('genderBoy').checked = flatGenders.includes('boy');
            document.getElementById('genderGirl').checked = flatGenders.includes('girl');
        }

        // Branding settings
        if (document.getElementById('tab3').classList.contains('active')) {
            loadBrandingSettings(configData);
        }

        showNotification('Config loaded successfully', 'success');
    } catch (error) {
        console.error('Error loading config:', error);
        showNotification('Error loading config: ' + error.message, 'error');
    }
}

// Function to load branding settings
function loadBrandingSettings(configData) {
    // Logos
    document.getElementById('logoPath').value = configData.logoPath || 'empty.png';
    document.getElementById('brandLogoPath').value = configData.brandLogoPath || 'empty.png';
    
    // Position and scale
    document.getElementById('logo_pos_x').value = configData.logo_pos_x || 0;
    document.getElementById('logo_pos_y').value = configData.logo_pos_y || 0;
    document.getElementById('logo_scale').value = configData.logo_scale || 1;
    document.getElementById('mainLogoScale').value = configData.mainLogoScale || 1;
    
    // Theme and backgrounds
    document.getElementById('theme').value = configData.theme || 'dark';
    
    // Remove 'px' from backdropBlur and set values
    const blurValue = parseInt(configData.backdropBlur) || 50;
    document.getElementById('backdropBlurRange').value = blurValue;
    document.getElementById('backdropBlur').value = blurValue + 'px';
    
    document.getElementById('animationEnabled').checked = configData.animationEnabled !== false;
    document.getElementById('animatedBackground').value = configData.animatedBackground || 
        'linear-gradient(-45deg, #ed030c, #c5c4fa, #c4facd, #ab9aff)';
    
    // Load gradient colors and setup gradient editor
    const gradientValue = configData.animatedBackground || 
        'linear-gradient(-45deg, #ed030c, #c5c4fa, #c4facd, #ab9aff)';
    document.getElementById('animatedBackground').value = gradientValue;
    
    // Parse gradient direction and colors
    setupGradientEditor(gradientValue);
    
    // Update gradient preview
    updateGradientPreview();
    
    // Light theme settings
    if (configData.lightTheme) {
        document.getElementById('lightBackgroundColor').value = configData.lightTheme.backgroundColor || '#ffebcd';
        document.getElementById('lightBackgroundColorPicker').value = configData.lightTheme.backgroundColor || '#ffebcd';
        document.getElementById('lightBackgroundImage').value = configData.lightTheme.backgroundImage || '';
        document.getElementById('lightTextColor').value = configData.lightTheme.lightTextColor || '#000000';
        document.getElementById('lightTextColorPicker').value = configData.lightTheme.lightTextColor || '#000000';
    }
    
    // Dark theme settings
    if (configData.darkTheme) {
        document.getElementById('darkBackgroundColor').value = configData.darkTheme.backgroundColor || '#000000';
        document.getElementById('darkBackgroundColorPicker').value = configData.darkTheme.backgroundColor || '#000000';
        document.getElementById('darkBackgroundImage').value = configData.darkTheme.backgroundImage || '';
        document.getElementById('darkTextColor').value = configData.darkTheme.darkTextColor || '#ffffff';
        document.getElementById('darkTextColorPicker').value = configData.darkTheme.darkTextColor || '#ffffff';
    }

    showNotification('Config loaded successfully', 'success');
}

// Function to parse CSS gradient string
function parseGradient(gradientStr) {
    // Default values if parsing fails
    let result = {
        direction: '-45deg',
        colors: ['#ed030c', '#c5c4fa', '#c4facd', '#ab9aff']
    };
    
    try {
        // Extract values between linear-gradient( and )
        const gradientContent = gradientStr.match(/linear-gradient\((.*)\)/);
        
        if (gradientContent && gradientContent[1]) {
            const parts = gradientContent[1].split(',');
            
            // First part is direction
            const direction = parts[0].trim();
            result.direction = direction;
            
            // Rest are colors
            result.colors = parts.slice(1).map(color => color.trim());
        }
    } catch (e) {
        console.error('Error parsing gradient:', e);
    }
    
    return result;
}

// Function to setup the gradient editor
function setupGradientEditor(gradientValue) {
    const { direction, colors } = parseGradient(gradientValue);
    
    // Set direction in dropdown
    const directionSelect = document.getElementById('gradientDirection');
    if (directionSelect) {
        directionSelect.value = direction;
    }
    
    // Create color pickers for each color
    const gradientColors = document.querySelector('.gradient-colors');
    if (gradientColors) {
        gradientColors.innerHTML = ''; // Clear existing color pickers
        
        colors.forEach((color, index) => {
            addColorToGradientEditor(color, index);
        });
    }
    
    // Set up event listeners if not already set
    if (!window.gradientEditorInitialized) {
        // Add color button
        const addColorBtn = document.getElementById('addGradientColor');
        if (addColorBtn) {
            addColorBtn.addEventListener('click', () => {
                const colorCount = document.querySelectorAll('.gradient-color').length;
                addColorToGradientEditor('#ffffff', colorCount);
                updateGradientFromEditor();
            });
        }
        
        // Remove color button
        const removeColorBtn = document.getElementById('removeGradientColor');
        if (removeColorBtn) {
            removeColorBtn.addEventListener('click', () => {
                const colorElements = document.querySelectorAll('.gradient-color');
                if (colorElements.length > 2) { // Keep at least 2 colors
                    colorElements[colorElements.length - 1].remove();
                    updateGradientFromEditor();
                }
            });
        }
        
        // Direction change
        const directionSelect = document.getElementById('gradientDirection');
        if (directionSelect) {
            directionSelect.addEventListener('change', updateGradientFromEditor);
        }
        
        window.gradientEditorInitialized = true;
    }
}

// Function to add a color to the gradient editor
function addColorToGradientEditor(color, index) {
    const gradientColors = document.querySelector('.gradient-colors');
    if (!gradientColors) return;
    
    // Create color picker container
    const colorDiv = document.createElement('div');
    colorDiv.className = 'gradient-color';
    
    // Create color picker
    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.className = 'gradient-color-picker';
    colorPicker.value = color;
    colorPicker.setAttribute('data-index', index);
    
    // Create label
    const colorLabel = document.createElement('span');
    colorLabel.className = 'gradient-color-label';
    colorLabel.textContent = `Цвет ${index + 1}`;
    
    // Add to container
    colorDiv.appendChild(colorPicker);
    colorDiv.appendChild(colorLabel);
    gradientColors.appendChild(colorDiv);
    
    // Add event listener to update gradient when color changes
    colorPicker.addEventListener('input', updateGradientFromEditor);
}

// Function to update the gradient string from editor inputs
function updateGradientFromEditor() {
    // Get direction
    const direction = document.getElementById('gradientDirection').value;
    
    // Get colors
    const colorPickers = document.querySelectorAll('.gradient-color-picker');
    const colors = Array.from(colorPickers).map(picker => picker.value);
    
    // Build gradient string
    const gradientStr = `linear-gradient(${direction}, ${colors.join(', ')})`;
    
    // Update hidden input
    document.getElementById('animatedBackground').value = gradientStr;
    
    // Update preview
    updateGradientPreview();
}

// Function to update gradient preview
function updateGradientPreview() {
    const gradientValue = document.getElementById('animatedBackground').value;
    const previewElement = document.getElementById('gradientPreview');
    if (previewElement) {
        previewElement.style.background = gradientValue;
    }
}

// Function to save branding settings
function saveBrandingSettings(configData) {
    // Logos
    configData.logoPath = document.getElementById('logoPath').value;
    configData.brandLogoPath = document.getElementById('brandLogoPath').value;
    
    // Position and scale
    configData.logo_pos_x = parseInt(document.getElementById('logo_pos_x').value, 10);
    configData.logo_pos_y = parseInt(document.getElementById('logo_pos_y').value, 10);
    configData.logo_scale = parseFloat(document.getElementById('logo_scale').value);
    configData.mainLogoScale = parseFloat(document.getElementById('mainLogoScale').value);
    
    // Theme and backgrounds
    configData.theme = document.getElementById('theme').value;
    configData.backdropBlur = document.getElementById('backdropBlur').value;
    configData.animationEnabled = document.getElementById('animationEnabled').checked;
    configData.animatedBackground = document.getElementById('animatedBackground').value;
    
    // Light theme settings
    configData.lightTheme = {
        backgroundColor: document.getElementById('lightBackgroundColor').value,
        backgroundImage: document.getElementById('lightBackgroundImage').value,
        lightTextColor: document.getElementById('lightTextColor').value
    };
    
    // Dark theme settings
    configData.darkTheme = {
        backgroundColor: document.getElementById('darkBackgroundColor').value,
        backgroundImage: document.getElementById('darkBackgroundImage').value,
        darkTextColor: document.getElementById('darkTextColor').value
    };
    
    return configData;
}

// Function to load print settings
function loadPrintSettings(configData) {
    // Set selected printer
    const printerSelect = document.getElementById('defaultPrinter');
    if (printerSelect) {
        const selectedPrinter = configData.defaultPrinter || '';
        
        // Check if the printer exists in the dropdown
        let printerExists = false;
        for (let i = 0; i < printerSelect.options.length; i++) {
            if (printerSelect.options[i].value === selectedPrinter) {
                printerExists = true;
                break;
            }
        }
        
        // Set selected printer if it exists, otherwise default to empty
        printerSelect.value = printerExists ? selectedPrinter : '';
    }
    
    // Border Print Image
    document.getElementById('borderPrintImage').checked = configData.borderPrintImage || false;
    
    // Print Button Visibility
    document.getElementById('printButtonVisible').checked = configData.printButtonVisible !== false; // Default to true if undefined
    
    // Orientation
    document.getElementById('orientation').value = configData.orientation || '';
    
    // Load paper size settings
    document.getElementById('paperSizeWidth').value = configData.paperSizeWidth || 105;
    document.getElementById('paperSizeHeight').value = configData.paperSizeHeight || 148;
    
    // Load hot folder settings
    if (configData.hotFolder) {
        document.getElementById('hotFolderEnabled').checked = configData.hotFolder.enabled || false;
        document.getElementById('hotFolderPath').value = configData.hotFolder.path || '';
    } else {
        document.getElementById('hotFolderEnabled').checked = false;
        document.getElementById('hotFolderPath').value = '';
    }
    
    // Additional settings (might not be in original config, so setting defaults)
    if (document.getElementById('printCopies')) {
        document.getElementById('printCopies').value = configData.printCopies || 1;
    }
    
    if (document.getElementById('confirmPrint')) {
        document.getElementById('confirmPrint').checked = configData.confirmPrint || false;
    }
    
    showNotification('Print settings loaded successfully', 'success');
}

// Function to load available printers
async function loadAvailablePrinters() {
    const printerSelect = document.getElementById('defaultPrinter');
    if (!printerSelect) return;
    
    try {
        // Get printers list from main process
        const printers = await ipcRenderer.invoke('get-printers');
        
        // Clear existing options, keeping only the default option
        while (printerSelect.options.length > 1) {
            printerSelect.remove(1);
        }
        
        // Add printers to dropdown
        printers.forEach(printer => {
            const option = document.createElement('option');
            option.value = printer.name;
            option.textContent = printer.name;
            printerSelect.appendChild(option);
        });
        
        console.log(`Loaded ${printers.length} printers`);
    } catch (error) {
        console.error('Error loading printers:', error);
        showNotification('Error loading printers: ' + error.message, 'error');
    }
}

// Function to save config settings
function saveConfigSettings() {
    if (!currentFolderPath) {
        showNotification('Папка событий не выбрана', 'error');
        return;
    }

    const configPath = path.join(currentFolderPath, 'config.json');
    try {
        const formData = collectFormData();
        let existingConfig = {};

        if (fs.existsSync(configPath)) {
            existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }

        // Update config with form values
        const updatedConfig = { ...existingConfig, ...formData };

        // Write the updated config to file
        fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2), 'utf8');

        // Notify the main process that config has been updated
        ipcRenderer.send('config-updated', currentFolderPath);
        
        showNotification('Настройки сохранены успешно', 'success');
    } catch (error) {
        console.error('Error saving config:', error);
        showNotification('Ошибка сохранения настроек: ' + error.message, 'error');
    }
}

// Function to collect form data from active tab
function collectFormData() {
    const activeTab = document.querySelector('.tab-content.active');
    if (!activeTab) return {};
    
    const formData = {};
    
    // Check which tab is active to collect the appropriate data
    const tabId = activeTab.id;
    
    if (tabId === 'tab2') {
        // Basic settings
        const prePhotoTimer = document.getElementById('prePhotoTimer');
        if (prePhotoTimer) {
            formData.prePhotoTimer = parseInt(prePhotoTimer.value) || 3;
        }
        
        const inactivityTimeout = document.getElementById('inactivityTimeout');
        if (inactivityTimeout) {
            formData.inactivityTimeout = parseInt(inactivityTimeout.value) * 1000 || 60000; // Convert seconds to ms
        }
        
        // Language settings
        const languageCurrent = document.getElementById('languageCurrent');
        const showLanguageSwitcher = document.getElementById('showLanguageSwitcher');
        
        formData.language = {
            current: languageCurrent ? languageCurrent.value || 'ru' : 'ru',
            showSwitcher: showLanguageSwitcher ? showLanguageSwitcher.checked : false
        };
        
        // Boolean settings
        const showResultQrBtn = document.getElementById('showResultQrBtn');
        const showStyleNames = document.getElementById('showStyleNames');
        const visibilityAgree = document.getElementById('visibilityAgree');
        const allowMultipleGenderSelection = document.getElementById('allowMultipleGenderSelection');
        
        formData.showResultQrBtn = showResultQrBtn ? showResultQrBtn.checked : false;
        formData.showStyleNames = showStyleNames ? showStyleNames.checked : false;
        formData.visibilityAgree = visibilityAgree ? visibilityAgree.checked : false;
        formData.allowMultipleGenderSelection = allowMultipleGenderSelection ? allowMultipleGenderSelection.checked : false;
        
        // Gender settings - collect selected genders
        const genders = [];
        const genderMale = document.getElementById('genderMale');
        const genderFemale = document.getElementById('genderFemale');
        const genderBoy = document.getElementById('genderBoy');
        const genderGirl = document.getElementById('genderGirl');
        const genderGroup = document.getElementById('genderGroup');
        
        if (genderMale && genderMale.checked) genders.push('man');
        if (genderFemale && genderFemale.checked) genders.push('woman');
        if (genderBoy && genderBoy.checked) genders.push('boy');
        if (genderGirl && genderGirl.checked) genders.push('girl');
        if (genderGroup && genderGroup.checked) genders.push('group');
        
        // Ensure at least one gender is selected
        if (genders.length === 0) {
            genders.push('man'); // Default to 'man' if none selected
        }
        
        formData.allowedGenders = genders;
    } 
    else if (tabId === 'tab3') {
        // Branding settings - get elements first then check
        const logoPath = document.getElementById('logoPath');
        const brandLogoPath = document.getElementById('brandLogoPath');
        const logo_pos_x = document.getElementById('logo_pos_x');
        const logo_pos_y = document.getElementById('logo_pos_y');
        const logo_scale = document.getElementById('logo_scale');
        const mainLogoScale = document.getElementById('mainLogoScale');
        const theme = document.getElementById('theme');
        const backdropBlur = document.getElementById('backdropBlur');
        const animationEnabled = document.getElementById('animationEnabled');
        const animatedBackground = document.getElementById('animatedBackground');
        
        // Only set properties if elements exist
        if (logoPath) formData.logoPath = logoPath.value;
        if (brandLogoPath) formData.brandLogoPath = brandLogoPath.value;
        if (logo_pos_x) formData.logo_pos_x = parseInt(logo_pos_x.value) || 0;
        if (logo_pos_y) formData.logo_pos_y = parseInt(logo_pos_y.value) || 0;
        if (logo_scale) formData.logo_scale = parseFloat(logo_scale.value) || 1;
        if (mainLogoScale) formData.mainLogoScale = parseFloat(mainLogoScale.value) || 1;
        if (theme) formData.theme = theme.value;
        if (backdropBlur) formData.backdropBlur = backdropBlur.value;
        if (animationEnabled) formData.animationEnabled = animationEnabled.checked;
        if (animatedBackground) formData.animatedBackground = animatedBackground.value;
        
        // Light theme settings
        const lightBackgroundColor = document.getElementById('lightBackgroundColor');
        const lightBackgroundImage = document.getElementById('lightBackgroundImage');
        const lightTextColor = document.getElementById('lightTextColor');
        
        if (lightBackgroundColor || lightBackgroundImage || lightTextColor) {
            formData.lightTheme = {
                backgroundColor: lightBackgroundColor ? lightBackgroundColor.value : '#ffebcd',
                backgroundImage: lightBackgroundImage ? lightBackgroundImage.value : '',
                lightTextColor: lightTextColor ? lightTextColor.value : '#000000'
            };
        }
        
        // Dark theme settings
        const darkBackgroundColor = document.getElementById('darkBackgroundColor');
        const darkBackgroundImage = document.getElementById('darkBackgroundImage');
        const darkTextColor = document.getElementById('darkTextColor');
        
        if (darkBackgroundColor || darkBackgroundImage || darkTextColor) {
            formData.darkTheme = {
                backgroundColor: darkBackgroundColor ? darkBackgroundColor.value : '#000000',
                backgroundImage: darkBackgroundImage ? darkBackgroundImage.value : '',
                darkTextColor: darkTextColor ? darkTextColor.value : '#ffffff'
            };
        }
    }
    else if (tabId === 'tab4') {
        // Printing settings
        const defaultPrinter = document.getElementById('defaultPrinter');
        const borderPrintImage = document.getElementById('borderPrintImage');
        const printButtonVisible = document.getElementById('printButtonVisible');
        const orientation = document.getElementById('orientation');
        const paperSizeWidth = document.getElementById('paperSizeWidth');
        const paperSizeHeight = document.getElementById('paperSizeHeight');
        
        if (defaultPrinter) formData.defaultPrinter = defaultPrinter.value;
        if (borderPrintImage) formData.borderPrintImage = borderPrintImage.checked;
        if (printButtonVisible) formData.printButtonVisible = printButtonVisible.checked;
        if (orientation) formData.orientation = orientation.value;
        if (paperSizeWidth) formData.paperSizeWidth = parseInt(paperSizeWidth.value) || 105;
        if (paperSizeHeight) formData.paperSizeHeight = parseInt(paperSizeHeight.value) || 148;
        
        // Hot folder settings
        const hotFolderEnabled = document.getElementById('hotFolderEnabled');
        const hotFolderPath = document.getElementById('hotFolderPath');
        
        if (hotFolderEnabled || hotFolderPath) {
            formData.hotFolder = {
                enabled: hotFolderEnabled ? hotFolderEnabled.checked : false,
                path: hotFolderPath ? hotFolderPath.value : ''
            };
        }
        
        // Additional print settings if they exist in the form
        const printCopies = document.getElementById('printCopies');
        const confirmPrint = document.getElementById('confirmPrint');
        
        if (printCopies) {
            formData.printCopies = parseInt(printCopies.value) || 1;
        }
        
        if (confirmPrint) {
            formData.confirmPrint = confirmPrint.checked;
        }
    }
    else if (tabId === 'tab5') {
        // Camera settings
        const camera_rotation = document.getElementById('camera_rotation');
        const send_image_rotation = document.getElementById('send_image_rotation');
        const isEvf = document.getElementById('isEvf');
        
        if (camera_rotation) formData.camera_rotation = parseInt(camera_rotation.value) || 0;
        if (send_image_rotation) formData.send_image_rotation = parseInt(send_image_rotation.value) || 0;
        if (isEvf) formData.isEvf = isEvf.checked;
        
        // Canon specific settings
        const canonIso = document.getElementById('canonIso');
        const canonTv = document.getElementById('canonTv');
        const canonAv = document.getElementById('canonAv');
        const canonWb = document.getElementById('canonWb');
        const canonPictureStyle = document.getElementById('canonPictureStyle');
        
        if (canonIso && canonTv && canonAv && canonWb && canonPictureStyle) {
            formData.canonSettings = {
                iso: canonIso.value,
                tv: canonTv.value,
                av: canonAv.value,
                wb: canonWb.value,
                pictureStyle: canonPictureStyle.value
            };
        }
    }
    
    return formData;
}

// Function to show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Add an icon based on notification type
    let icon = '';
    if (type === 'success') {
        icon = '✓';
    } else if (type === 'error') {
        icon = '✕';
    } else {
        icon = 'ℹ';
    }
    
    notification.innerHTML = `<span class="notification-icon">${icon}</span> ${message}`;
    
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

// Add function to immediately open photobooth with current settings
function openPhotoboothWithCurrentSettings() {
    if (!currentFolderPath) {
        showNotification('No event folder selected', 'error');
        return;
    }
    
    // Save current settings first
    saveConfigSettings();
    
    // Then open the photobooth
    ipcRenderer.send('switch-to-photobooth', currentFolderPath);
}

// Function to load global config.json
async function loadGlobalConfig() {
    try {
        const globalConfigPath = path.join('c:', 'temp', 'globalConfig.json');
        if (fs.existsSync(globalConfigPath)) {
            return JSON.parse(fs.readFileSync(globalConfigPath, 'utf8'));
        } else {
            return { cameraMode: 'pc' }; // Default value
        }
    } catch (error) {
        console.error('Error loading global config:', error);
        return { cameraMode: 'pc' }; // Default value on error
    }
}

// Function to save global config.json
async function saveGlobalConfig(config) {
    try {
        const globalConfigPath = path.join('c:', 'temp', 'globalConfig.json');
        fs.writeFileSync(globalConfigPath, JSON.stringify(config, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving global config:', error);
        throw error;
    }
}

// Function to load camera settings
function loadCameraSettings(configData, globalConfig) {
    // Load camera mode from global config
    const cameraModeSelect = document.getElementById('cameraMode');
    if (cameraModeSelect) {
        cameraModeSelect.value = globalConfig.cameraMode || 'pc';
        
        // Show/hide Canon settings based on camera mode
        const canonSettings = document.getElementById('canon-settings');
        
        if (cameraModeSelect.value === 'canon') {
            canonSettings.style.display = 'block';
        } else {
            canonSettings.style.display = 'none';
        }
    }
    
    // Load camera rotation settings from event config
    document.getElementById('camera_rotation').value = configData.camera_rotation || 0;
    document.getElementById('send_image_rotation').value = configData.send_image_rotation || 0;
    document.getElementById('isEvf').checked = configData.isEvf || false;
    
    // Load Canon specific settings if available
    if (configData.canonSettings) {
        const canonSettings = configData.canonSettings;
        
        if (document.getElementById('canonIso')) {
            document.getElementById('canonIso').value = canonSettings.iso || '100';
        }
        
        if (document.getElementById('canonTv')) {
            document.getElementById('canonTv').value = canonSettings.tv || '1/60';
        }
        
        if (document.getElementById('canonAv')) {
            document.getElementById('canonAv').value = canonSettings.av || '5.6';
        }
        
        if (document.getElementById('canonWb')) {
            document.getElementById('canonWb').value = canonSettings.wb || 'auto';
        }
        
        if (document.getElementById('canonPictureStyle')) {
            document.getElementById('canonPictureStyle').value = canonSettings.pictureStyle || 'standard';
        }
    }
    
    // Apply camera rotation to preview elements
    const rotation = configData.camera_rotation || 0;
    document.getElementById('camera-preview').style.transform = `rotate(${rotation}deg)`;
    document.getElementById('canon-preview').style.transform = `rotate(${rotation}deg)`;

    showNotification('Camera settings loaded successfully', 'success');
}

// Function to save camera settings
async function saveCameraSettings() {
    if (!currentFolderPath) {
        showNotification('No event folder selected', 'error');
        return;
    }

    try {
        // Save camera mode to global config
        const cameraMode = document.getElementById('cameraMode').value;
        const globalConfig = await loadGlobalConfig();
        globalConfig.cameraMode = cameraMode;
        await saveGlobalConfig(globalConfig);
        
        // Save other camera settings to event config
        const configPath = path.join(currentFolderPath, 'config.json');
        let configData = {};
        
        if (fs.existsSync(configPath)) {
            configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        
        // Update camera rotation settings
        configData.camera_rotation = parseInt(document.getElementById('camera_rotation').value);
        
        // Update Canon specific settings
        if (cameraMode === 'canon') {
            configData.canonSettings = {
                iso: document.getElementById('canonIso').value,
                tv: document.getElementById('canonTv').value,
                av: document.getElementById('canonAv').value,
                wb: document.getElementById('canonWb').value,
                pictureStyle: document.getElementById('canonPictureStyle').value
            };
        }
        
        // Write the updated config back to file
        fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
        
        // Apply camera rotation to preview elements
        const rotation = parseInt(document.getElementById('camera_rotation').value);
        document.getElementById('camera-preview').style.transform = `rotate(${rotation}deg)`;
        document.getElementById('canon-preview').style.transform = `rotate(${rotation}deg)`;

        // Notify main process about config update
        ipcRenderer.send('config-updated', currentFolderPath);
        ipcRenderer.send('camera-mode-changed', cameraMode);
        
        showNotification('Camera settings saved successfully', 'success');
    } catch (error) {
        console.error('Error saving camera settings:', error);
        showNotification('Error saving camera settings: ' + error.message, 'error');
    }
}
