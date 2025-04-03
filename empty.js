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
    
    // File selection buttons - updated to use the new approach
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
        showNotification('No event folder selected', 'error');
        return;
    }

    const configPath = path.join(currentFolderPath, 'config.json');
    
    try {
        // First load the existing config to avoid overwriting other settings
        let configData = {};
        if (fs.existsSync(configPath)) {
            configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        
        // Update the config with form values based on active tab
        
        // Interface tab (tab2) settings
        if (document.getElementById('tab2').classList.contains('active')) {
            configData.prePhotoTimer = parseInt(document.getElementById('prePhotoTimer').value, 10);
        
            // Convert seconds back to milliseconds for inactivityTimeout
            configData.inactivityTimeout = parseInt(document.getElementById('inactivityTimeout').value, 10) * 1000;
            
            // Language settings
            configData.language = {
                current: document.getElementById('languageCurrent').value,
                showSwitcher: document.getElementById('showLanguageSwitcher').checked
            };
            
            // Boolean settings
            configData.showResultQrBtn = document.getElementById('showResultQrBtn').checked;
            configData.showStyleNames = document.getElementById('showStyleNames').checked;
            configData.visibilityAgree = document.getElementById('visibilityAgree').checked;
            configData.allowMultipleGenderSelection = document.getElementById('allowMultipleGenderSelection').checked;
            
            // Allowed genders - create the nested array structure expected by the config
            const allowedGenders = [[], [], []];
            
            // Adults in first array
            if (document.getElementById('genderMale').checked) allowedGenders[0].push('man');
            if (document.getElementById('genderFemale').checked) allowedGenders[0].push('woman');
            
            // Children in second array
            if (document.getElementById('genderBoy').checked) allowedGenders[1].push('boy');
            if (document.getElementById('genderGirl').checked) allowedGenders[1].push('girl');
            
            // Third array remains empty since we removed the "Other" option
            
            configData.allowedGenders = allowedGenders;
        }

        // Branding tab (tab3) settings
        if (document.getElementById('tab3').classList.contains('active')) {
            configData = saveBrandingSettings(configData);
        }
        
        // Print tab (tab4) settings
        if (document.getElementById('tab4').classList.contains('active')) {
            // Default Printer
            const printerSelect = document.getElementById('defaultPrinter');
            if (printerSelect) {
                configData.defaultPrinter = printerSelect.value;
            }
            
            // Border Print Image
            configData.borderPrintImage = document.getElementById('borderPrintImage').checked;
            
            // Print Button Visibility
            configData.printButtonVisible = document.getElementById('printButtonVisible').checked;
            
            // Orientation
            configData.orientation = document.getElementById('orientation').value;
            
            // Additional settings
            if (document.getElementById('printCopies')) {
                configData.printCopies = parseInt(document.getElementById('printCopies').value, 10);
            }
            
            if (document.getElementById('confirmPrint')) {
                configData.confirmPrint = document.getElementById('confirmPrint').checked;
            }
        }
        
        // Write the updated config back to file
        fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
        
        // Notify main process about config update - this is the key addition
        ipcRenderer.send('config-updated', currentFolderPath);
        
        showNotification('Config saved successfully', 'success');
    } catch (error) {
        console.error('Error saving config:', error);
        showNotification('Error saving config: ' + error.message, 'error');
    }
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
