const IpcChannels = {
    // Main -> Renderer
    SELECTED_FOLDER_PATH: 'selected-folder-path',
    CONFIG_UPDATE: 'config-update',
    CAMERA_CONTROL_STATUS: 'camera-control-status',
    PRINT_PHOTO_RESPONSE: 'print-photo-response',

    // Renderer -> Main
    OPEN_MAIN_WINDOW: 'open-main-window',
    OPEN_EMPTY_WINDOW: 'open-empty-window',
    SELECTED_FOLDER: 'selected-folder',
    GET_SELECTED_FOLDER: 'get-selected-folder',
    CLOSE_APP: 'close-app',
    GET_STYLES: 'get-styles',
    PRINT_PHOTO: 'print-photo',
    SWITCH_TO_CONFIGURATOR: 'switch-to-configurator',
    SWITCH_TO_PHOTOBOOTH: 'switch-to-photobooth',
    GET_CONFIG: 'get-config',
    GET_CURRENT_CONFIG: 'get-current-config',
    SELECT_FILE: 'select-file',
    RELOAD_OPEN_WINDOWS: 'reload-open-windows',
    GET_PRINTERS: 'get-printers',
    CONFIG_UPDATED: 'config-updated',
    CAMERA_MODE_CHANGED: 'camera-mode-changed',
    SAVE_EVENT_CONFIG: 'save-event-config',
    SAVE_IMAGE: 'save-image',
    ENSURE_FOLDER_EXISTS: 'ensure-folder-exists',

    // New channels for refactored IPC
    VALIDATE_FOLDER_STRUCTURE: 'validate-folder-structure',
    LIST_EVENT_FOLDERS: 'list-event-folders',
    LIST_EVENT_FOLDER_NAMES: 'list-event-folder-names',
    GET_EVENT_CONFIG: 'get-event-config',
    SAVE_EVENT_CONFIG: 'save-event-config',
    DELETE_PHOTO: 'delete-photo',
    GET_STYLE_FILES: 'get-style-files',
    GET_STYLE_IMAGE_DATA: 'get-style-image-data',
    GET_CANON_IMAGE: 'get-canon-image',
    LIST_PHOTOS: 'list-photos',
    GET_TRANSLATIONS: 'get-translations',
    GET_RANDOM_STYLE_IMAGE: 'get-random-style-image'
};

// Use module.exports for compatibility with require in Electron
module.exports = IpcChannels;