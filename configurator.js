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

    // Exit configurator button
    const exitConfiguratorButton = document.getElementById('exit-configurator');
    if (exitConfiguratorButton) {
        exitConfiguratorButton.addEventListener('click', () => {
            // Close the configurator window and return to launcher
            ipcRenderer.send('return-to-launcher');
        });
    }

    // Global save config button
    const globalSaveButton = document.getElementById('save-config-global');
    if (globalSaveButton) {
        globalSaveButton.addEventListener('click', () => {
            saveConfigSettings();
        });
    }

    // Button to open photobooth window
    const openPhotoboothButton = document.getElementById('open-photobooth');
    
    openPhotoboothButton.addEventListener('click', () => {
        // Save settings before opening photobooth
        saveConfigSettings();
        
        // Then switch to photobooth
        const folderPath = ipcRenderer.sendSync('get-selected-folder');
        ipcRenderer.send('switch-to-photobooth', folderPath);
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

    // Keep the old save config button functionality for backward compatibility
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
        let originalCameraMode = cameraModeSelect.value;
        
        cameraModeSelect.addEventListener('change', () => {
            const canonSettings = document.getElementById('canon-settings');
            const selectedMode = cameraModeSelect.value;
            
            if (selectedMode === 'canon' && originalCameraMode !== 'canon') {
                // Show confirmation modal before switching to Canon mode
                showCameraModeModal();
                
                // Don't update UI yet until user confirms
                cameraModeSelect.value = originalCameraMode;
            } else {
                // For other changes, just update UI
                if (selectedMode === 'canon') {
                    canonSettings.style.display = 'block';
                } else {
                    canonSettings.style.display = 'none';
                }
                originalCameraMode = selectedMode;
            }
        });
    }
    
    // Camera mode change modal functionality
    const modal = document.getElementById('camera-mode-modal');
    const confirmButton = document.getElementById('confirm-camera-mode');
    const cancelButton = document.getElementById('cancel-camera-mode');
    
    if (modal && confirmButton && cancelButton) {
        confirmButton.addEventListener('click', async () => {
            try {
                // Save camera mode setting to global config
                const globalConfig = await loadGlobalConfig();
                globalConfig.cameraMode = 'canon'; // Set to canon mode
                await saveGlobalConfig(globalConfig);
                
                // Close the modal
                modal.style.display = 'none';
                
                // Show notification
                showNotification('Настройки камеры сохранены. Приложение будет закрыто.', 'success');
                
                // Wait a moment for the user to see the notification
                setTimeout(() => {
                    // Close the application
                    ipcRenderer.send('close-app');
                }, 2000);
            } catch (error) {
                console.error('Error saving camera mode:', error);
                showNotification('Ошибка сохранения настроек камеры: ' + error.message, 'error');
                modal.style.display = 'none';
            }
        });
        
        cancelButton.addEventListener('click', () => {
            // Close modal without making changes
            modal.style.display = 'none';
        });
        
        // Close modal if clicked outside
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // File selection buttons - updated to use the new approach
    // todo
    // 'selectHotFolder': 'hotFolderPath'
    const fileSelectors = {
        'selectLogo': { inputId: 'logoPath', previewId: 'logoPathPreview' },
        'selectBrandLogo': { inputId: 'brandLogoPath', previewId: 'brandLogoPathPreview' },
        'selectLightBgImage': { inputId: 'lightBackgroundImage', previewId: 'lightBackgroundImagePreview' },
        'selectDarkBgImage': { inputId: 'darkBackgroundImage', previewId: 'darkBackgroundImagePreview' }
    };
    
    Object.entries(fileSelectors).forEach(([buttonId, ids]) => {
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
                    const selectedPath = result.filePaths[0];
                    document.getElementById(ids.inputId).value = selectedPath;
                    
                    // Update image preview
                    updateImagePreview(ids.inputId, ids.previewId);
                    
                    // Show notification about path extraction
                    showNotification('Для сохранения будет использовано только имя файла', 'info');
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

    // Add input change listeners for image preview updates
    const imageInputs = ['logoPath', 'brandLogoPath', 'lightBackgroundImage', 'darkBackgroundImage'];
    
    imageInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('change', () => {
                updateImagePreview(inputId, inputId + 'Preview');
            });
            
            input.addEventListener('input', () => {
                updateImagePreview(inputId, inputId + 'Preview');
            });
        }
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
    // Logos - handle the case where logo paths might be stored as filenames or full paths
    // We'll show the full path in the UI if we're able to locate the file
    let logoPath = configData.logoPath || 'empty.png';
    let brandLogoPath = configData.brandLogoPath || 'empty.png';
    
    // Try to resolve full paths for display in the UI
    if (currentFolderPath) {
        // Check if paths are already absolute
        if (!path.isAbsolute(logoPath) && fs.existsSync(path.join(currentFolderPath, logoPath))) {
            logoPath = path.join(currentFolderPath, logoPath);
        }
        
        if (!path.isAbsolute(brandLogoPath) && fs.existsSync(path.join(currentFolderPath, brandLogoPath))) {
            brandLogoPath = path.join(currentFolderPath, brandLogoPath);
        }
    }
    
    document.getElementById('logoPath').value = logoPath;
    document.getElementById('brandLogoPath').value = brandLogoPath;
    
    // Update image previews
    updateImagePreview('logoPath', 'logoPathPreview');
    updateImagePreview('brandLogoPath', 'brandLogoPathPreview');
    
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
        
        // Handle image path for display in UI
        let lightBgImage = configData.lightTheme.backgroundImage || '';
        if (lightBgImage && currentFolderPath && !path.isAbsolute(lightBgImage)) {
            if (fs.existsSync(path.join(currentFolderPath, lightBgImage))) {
                lightBgImage = path.join(currentFolderPath, lightBgImage);
            }
        }
        
        document.getElementById('lightBackgroundImage').value = lightBgImage;
        updateImagePreview('lightBackgroundImage', 'lightBackgroundImagePreview');
        
        document.getElementById('lightTextColor').value = configData.lightTheme.lightTextColor || '#000000';
        document.getElementById('lightTextColorPicker').value = configData.lightTheme.lightTextColor || '#000000';
    }
    
    // Dark theme settings
    if (configData.darkTheme) {
        document.getElementById('darkBackgroundColor').value = configData.darkTheme.backgroundColor || '#000000';
        document.getElementById('darkBackgroundColorPicker').value = configData.darkTheme.backgroundColor || '#000000';
        
        // Handle image path for display in UI
        let darkBgImage = configData.darkTheme.backgroundImage || '';
        if (darkBgImage && currentFolderPath && !path.isAbsolute(darkBgImage)) {
            if (fs.existsSync(path.join(currentFolderPath, darkBgImage))) {
                darkBgImage = path.join(currentFolderPath, darkBgImage);
            }
        }
        
        document.getElementById('darkBackgroundImage').value = darkBgImage;
        updateImagePreview('darkBackgroundImage', 'darkBackgroundImagePreview');
        
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

// Function to save config settings - updated to be more aware of the active tab
function saveConfigSettings() {
    if (!currentFolderPath) {
        showNotification('Папка событий не выбрана', 'error');
        return;
    }

    const configPath = path.join(currentFolderPath, 'config.json');
    try {
        // Determine the currently active tab to prioritize its data collection
        const activeTabId = document.querySelector('.tab-content.active').id;
        const formData = collectFormData(activeTabId);
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

// Function to collect form data - updated to accept specific tab ID
function collectFormData(specificTabId = null) {
    const formData = {};
    
    // If specificTabId is provided, only collect data from that tab
    // Otherwise, collect from the active tab
    const tabId = specificTabId || document.querySelector('.tab-content.active').id;
    
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
        if (logoPath) formData.logoPath = extractFilenameFromPath(logoPath.value);
        if (brandLogoPath) formData.brandLogoPath = extractFilenameFromPath(brandLogoPath.value);
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
                backgroundImage: lightBackgroundImage ? extractFilenameFromPath(lightBackgroundImage.value) : '',
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
                backgroundImage: darkBackgroundImage ? extractFilenameFromPath(darkBackgroundImage.value) : '',
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

// Helper function to extract filename from full path
function extractFilenameFromPath(filePath) {
    if (!filePath) return '';
    
    // Handle both Windows and Unix-style paths
    const normalizedPath = filePath.replace(/\\/g, '/');
    const parts = normalizedPath.split('/');
    return parts[parts.length - 1];
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
    console.log(configData)
    document.getElementById('camera_rotation').value = configData.camera_rotation || 0;
    // todo
    // document.getElementById('send_image_rotation').value = configData.send_image_rotation || 0;
    // document.getElementById('isEvf').checked = configData.isEvf || false;
    
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

// Function to save camera settings - update to handle the modal confirmation flow
async function saveCameraSettings() {
    if (!currentFolderPath) {
        showNotification('No event folder selected', 'error');
        return;
    }

    try {
        // Get current camera mode from select
        const cameraModeSelect = document.getElementById('cameraMode');
        const cameraMode = cameraModeSelect.value;
        
        // Get global config to check if mode is changing
        const globalConfig = await loadGlobalConfig();
        const currentMode = globalConfig.cameraMode || 'pc';
        
        // If switching to canon mode, show confirmation instead of saving
        if (cameraMode === 'canon' && currentMode !== 'canon') {
            showCameraModeModal();
            return; // Don't proceed with normal save
        }
        
        // For all other cases, proceed with normal save
        globalConfig.cameraMode = cameraMode;
        await saveGlobalConfig(globalConfig);
        
        // Continue with saving other camera settings to event config
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

// Function to show camera mode change modal
function showCameraModeModal() {
    const modal = document.getElementById('camera-mode-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Add function to update image preview
function updateImagePreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const previewContainer = document.getElementById(previewId);
    
    if (!input || !previewContainer) return;
    
    // Clear existing preview
    previewContainer.innerHTML = '';
    previewContainer.className = 'image-preview';
    
    if (!input.value) {
        previewContainer.classList.add('empty');
        return;
    }
    
    // Get file path
    let filePath = input.value;
    
    // If it's a relative path, try to resolve it against the current folder
    if (!path.isAbsolute(filePath) && currentFolderPath) {
        filePath = path.join(currentFolderPath, filePath);
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        previewContainer.innerHTML = '<div class="error-text">Файл не найден</div>';
        return;
    }
    
    // Create and add the image element
    const img = document.createElement('img');
    img.src = filePath;
    img.alt = path.basename(filePath);
    img.onerror = function() {
        previewContainer.innerHTML = '<div class="error-text">Ошибка загрузки изображения</div>';
    };
    
    previewContainer.appendChild(img);
}

// Function to initialize AI tab functionality
function initAITabFunctionality() {
    const modesScreen = document.getElementById('modes-screen');
    const stylesScreen = document.getElementById('styles-screen');
    const backButton = document.getElementById('back-to-modes');
    const availableModes = document.getElementById('available-modes');
    const selectedModeTitle = document.getElementById('selected-mode-title');
    const availableStyles = document.getElementById('available-styles');
    
    // First screen pinned styles elements
    const pinnedStylesContainer = document.getElementById('pinned-styles-container');
    const pinnedStyles = document.getElementById('pinned-styles');
    
    // Second screen pinned styles elements
    const pinnedStylesContainerSecond = document.getElementById('pinned-styles-container-second');
    const pinnedStylesSecond = document.getElementById('pinned-styles-second');
    
    let currentMode = '';
    let pinnedStylesList = [];
    
    // Load pinned styles from local storage or initialize empty array
    try {
        const savedStyles = localStorage.getItem('pinnedStyles');
        if (savedStyles) {
            pinnedStylesList = JSON.parse(savedStyles);
            updatePinnedStylesDisplay();
        }
    } catch (error) {
        console.error('Error loading pinned styles:', error);
        pinnedStylesList = [];
    }
    
    // Setup event listeners for mode cards
    if (availableModes) {
        const modeCards = availableModes.querySelectorAll('.mode-card');
        modeCards.forEach(card => {
            card.addEventListener('click', () => {
                const mode = card.getAttribute('data-mode');
                currentMode = mode;
                selectedModeTitle.textContent = 'Стили для режима: ' + card.querySelector('h4').textContent;
                loadStylesForMode(mode);
                showScreen('styles-screen');
            });
        });
    }
    
    // Setup back button
    if (backButton) {
        backButton.addEventListener('click', () => {
            showScreen('modes-screen');
        });
    }
    
    // Function to show a specific screen
    function showScreen(screenId) {
        document.querySelectorAll('.ai-screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }
    
    // Function to load styles for the selected mode
    function loadStylesForMode(mode) {
        if (!availableStyles) return;
        
        // Clear existing styles
        availableStyles.innerHTML = '';
        
        // Add the "Add Style" button first
        const addButton = document.createElement('div');
        addButton.className = 'style-card add-style-button';
        addButton.innerHTML = `
            <div class="add-icon">+</div>
            <div class="add-text">Добавить стиль</div>
        `;
        addButton.addEventListener('click', () => {
            selectStyleFromFolder(mode);
        });
        availableStyles.appendChild(addButton);
        
        // If we're using real folder paths, get the current folder path
        if (currentFolderPath) {
            loadStylesFromFolder(currentFolderPath, mode);
        } else {
            // Fallback to dummy styles if no folder is selected
            loadDummyStyles(mode);
        }
    }
    
    // Function to load styles from the current event folder
    function loadStylesFromFolder(folderPath, mode) {
        try {
            const stylesDir = path.join(folderPath, 'styles');
            
            if (!fs.existsSync(stylesDir)) {
                console.warn(`Styles directory not found: ${stylesDir}`);
                loadDummyStyles(mode);
                return;
            }
            
            // Check for gender folders
            const genderFolders = ['man', 'woman', 'boy', 'girl', 'group'];
            let stylesFound = false;
            
            for (const gender of genderFolders) {
                const genderDir = path.join(stylesDir, gender);
                
                if (fs.existsSync(genderDir)) {
                    const stylesFolders = fs.readdirSync(genderDir, { withFileTypes: true })
                        .filter(dirent => dirent.isDirectory())
                        .map(dirent => dirent.name);
                    
                    if (stylesFolders.length > 0) {
                        stylesFound = true;
                        
                        stylesFolders.forEach(style => {
                            // Check if this style is already pinned
                            const isAlreadyPinned = pinnedStylesList.some(
                                pinnedStyle => pinnedStyle.mode === mode && pinnedStyle.name === style
                            );
                            
                            if (!isAlreadyPinned) {
                                addStyleCard(style, mode, gender, genderDir);
                            }
                        });
                    }
                }
            }
            
            if (!stylesFound) {
                loadDummyStyles(mode);
            }
        } catch (error) {
            console.error('Error loading styles from folder:', error);
            loadDummyStyles(mode);
        }
    }
    
    // Function to add a style card to the grid
    function addStyleCard(styleName, mode, gender, genderDir) {
        try {
            // Try to find a preview image for the style
            let previewImg = './icons/default-style.jpg';
            
            const styleDir = path.join(genderDir, styleName);
            if (fs.existsSync(styleDir)) {
                const files = fs.readdirSync(styleDir);
                const imageFiles = files.filter(file => /\.(jpg|jpeg|png)$/i.test(file));
                
                if (imageFiles.length > 0) {
                    // Prefer images that start with '1' as they're typically previews
                    const previewFiles = imageFiles.filter(file => file.startsWith('1'));
                    const imgFile = previewFiles.length > 0 ? previewFiles[0] : imageFiles[0];
                    previewImg = path.join(styleDir, imgFile);
                }
            }
            
            const styleCard = document.createElement('div');
            styleCard.className = 'style-card';
            styleCard.setAttribute('data-style', styleName);
            styleCard.setAttribute('data-mode', mode);
            styleCard.setAttribute('data-gender', gender);
            
            styleCard.innerHTML = `
                <div class="style-image">
                    <img src="${previewImg}" alt="${styleName}">
                </div>
                <div class="style-info">
                    <h4>${styleName}</h4>
                    <p>Пол: ${getGenderDisplayName(gender)}</p>
                </div>
            `;
            
            styleCard.addEventListener('click', () => {
                addToPinnedStyles(mode, styleName, gender, previewImg);
            });
            
            availableStyles.appendChild(styleCard);
        } catch (error) {
            console.error(`Error adding style card for ${styleName}:`, error);
        }
    }
    
    // Function to get readable gender name in Russian
    function getGenderDisplayName(gender) {
        const genderMap = {
            'man': 'Мужчина',
            'woman': 'Женщина',
            'boy': 'Мальчик',
            'girl': 'Девочка',
            'group': 'Группа'
        };
        return genderMap[gender] || gender;
    }
    
    // Function to add a style to the pinned styles list
    function addToPinnedStyles(mode, styleName, gender, previewImg) {
        try {
            // Check if already in list
            const exists = pinnedStylesList.some(
                item => item.mode === mode && item.name === styleName
            );
            
            if (!exists) {
                pinnedStylesList.push({
                    mode: mode,
                    name: styleName,
                    gender: gender,
                    image: previewImg
                });
                
                // Save to local storage
                localStorage.setItem('pinnedStyles', JSON.stringify(pinnedStylesList));
                
                // Update UI
                updatePinnedStylesDisplay();
                
                // Show notification
                showNotification(`Стиль "${styleName}" добавлен в избранное`, 'success');
            } else {
                showNotification(`Стиль "${styleName}" уже в избранном`, 'info');
            }
        } catch (error) {
            console.error('Error adding to pinned styles:', error);
            showNotification('Ошибка при добавлении стиля', 'error');
        }
    }
    
    // Updated function to update the pinned styles display on both screens
    function updatePinnedStylesDisplay() {
        // First screen pinned styles
        if (pinnedStyles) {
            // Clear existing pinned styles
            pinnedStyles.innerHTML = '';
            
            // Hide container if no pinned styles on first screen
            if (pinnedStylesList.length === 0) {
                pinnedStylesContainer.style.display = 'none';
            } else {
                pinnedStylesContainer.style.display = 'block';
                createPinnedStyleCards(pinnedStyles);
            }
        }
        
        // Second screen pinned styles - always visible, even if empty
        if (pinnedStylesSecond) {
            // Clear existing pinned styles
            pinnedStylesSecond.innerHTML = '';
            
            if (pinnedStylesList.length === 0) {
                // Add an empty state message on the second screen
                const emptyMessage = document.createElement('p');
                emptyMessage.className = 'empty-styles-message';
                emptyMessage.textContent = 'У вас пока нет избранных стилей. Нажмите на стиль ниже, чтобы добавить его в избранное.';
                pinnedStylesSecond.appendChild(emptyMessage);
            } else {
                // Create pinned style cards for the second screen
                createPinnedStyleCards(pinnedStylesSecond);
            }
        }
    }
    
    // Helper function to create pinned style cards in a specified container
    function createPinnedStyleCards(container) {
        pinnedStylesList.forEach((style, index) => {
            // Get mode display name
            let modeDisplayName = style.mode;
            const modeElement = document.querySelector(`.mode-card[data-mode="${style.mode}"]`);
            if (modeElement) {
                modeDisplayName = modeElement.querySelector('h4').textContent;
            }
            
            const pinnedStyleCard = document.createElement('div');
            pinnedStyleCard.className = 'mode-card pinned-style';
            pinnedStyleCard.setAttribute('data-index', index);
            
            pinnedStyleCard.innerHTML = `
                <div class="style-badge">${modeDisplayName}</div>
                <button class="delete-style" title="Удалить стиль">×</button>
                <div class="mode-image">
                    <img src="${style.image}" alt="${style.name}">
                </div>
                <div class="mode-info">
                    <h4>${style.name}</h4>
                    <p>Пол: ${getGenderDisplayName(style.gender)}</p>
                </div>
            `;
            
            // Add delete button event listener
            pinnedStyleCard.querySelector('.delete-style').addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click
                removePinnedStyle(index);
            });
            
            // Make the whole card clickable
            pinnedStyleCard.addEventListener('click', () => {
                // If we're on the modes screen, go to styles screen
                if (modesScreen.classList.contains('active')) {
                    currentMode = style.mode;
                    selectedModeTitle.textContent = 'Стили для режима: ' + modeDisplayName;
                    loadStylesForMode(style.mode);
                    showScreen('styles-screen');
                }
            });
            
            container.appendChild(pinnedStyleCard);
        });
    }
    
    // Function to remove a pinned style
    function removePinnedStyle(index) {
        try {
            const removedStyle = pinnedStylesList[index];
            pinnedStylesList.splice(index, 1);
            
            // Save to local storage
            localStorage.setItem('pinnedStyles', JSON.stringify(pinnedStylesList));
            
            // Update UI
            updatePinnedStylesDisplay();
            
            // Reload current mode styles if in styles screen
            if (stylesScreen.classList.contains('active') && removedStyle.mode === currentMode) {
                loadStylesForMode(currentMode);
            }
            
            showNotification(`Стиль "${removedStyle.name}" удален из избранного`, 'info');
        } catch (error) {
            console.error('Error removing pinned style:', error);
            showNotification('Ошибка при удалении стиля', 'error');
        }
    }
    
    // Function to select a style from folder dialog
    function selectStyleFromFolder(mode) {
        showNotification('Эта функция будет доступна в следующей версии', 'info');
        // Placeholder for future implementation
    }
    
    // Function to load dummy styles for demonstration
    function loadDummyStyles(mode) {
        const dummyStyles = [
            { name: 'Классический', gender: 'man' },
            { name: 'Неоновый', gender: 'woman' },
            { name: 'Ретро', gender: 'boy' },
            { name: 'Гламур', gender: 'girl' },
            { name: 'Фэнтези', gender: 'group' }
        ];
        
        dummyStyles.forEach(style => {
            // Check if this style is already pinned
            const isAlreadyPinned = pinnedStylesList.some(
                pinnedStyle => pinnedStyle.mode === mode && pinnedStyle.name === style.name
            );
            
            if (!isAlreadyPinned) {
                const styleCard = document.createElement('div');
                styleCard.className = 'style-card';
                styleCard.setAttribute('data-style', style.name);
                styleCard.setAttribute('data-mode', mode);
                styleCard.setAttribute('data-gender', style.gender);
                
                styleCard.innerHTML = `
                    <div class="style-image">
                        <img src="./icons/default-style.jpg" alt="${style.name}">
                    </div>
                    <div class="style-info">
                        <h4>${style.name}</h4>
                        <p>Пол: ${getGenderDisplayName(style.gender)}</p>
                    </div>
                `;
                
                styleCard.addEventListener('click', () => {
                    addToPinnedStyles(mode, style.name, style.gender, './icons/default-style.jpg');
                });
                
                availableStyles.appendChild(styleCard);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Existing code...
    
    // AI Tab functionality (Tab 1)
    initAITabFunctionality();
});
