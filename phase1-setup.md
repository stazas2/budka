# Phase 1: Initial Setup Implementation

## Directory Structure to Create

```
src/
├── main/
│   ├── services/
│   ├── utils/
│   └── main.js
├── renderer/
│   ├── components/
│   │   ├── Notification/
│   │   ├── Modal/
│   │   ├── FilePicker/
│   │   ├── GradientEditor/
│   │   ├── Countdown/
│   │   └── TabSwitcher/
│   ├── services/
│   │   ├── IpcRendererService/
│   │   ├── WebcamService/
│   │   ├── CanonCameraService/
│   │   ├── LocalizationService/
│   │   └── ThemeService/
│   ├── assets/
│   │   ├── css/
│   │   ├── fonts/
│   │   ├── icons/
│   │   └── translations.json
│   └── utils/
├── shared/
│   ├── constants/
│   └── utils/
└── windows/
    ├── launcher/
    ├── configurator/
    └── photobooth/
```

## File Moves Required

1. Main Process Files:

- `main.js` -> `src/main/main.js`
- `utils/configLoader.js` -> `src/main/services/ConfigurationService.js`

2. Window Files:

- Configurator Window:

  - `empty.html` -> `src/windows/configurator/configurator.html`
  - `empty.js` -> `src/windows/configurator/configurator.js`
  - `empty.css` -> `src/windows/configurator/configurator.css`

- Photobooth Window:

  - `index.html` -> `src/windows/photobooth/photobooth.html`
  - `script.js` -> `src/windows/photobooth/photobooth.js`
  - `styles.css` -> `src/windows/photobooth/photobooth.css`

- Launcher Window:
  - `launcher.html` -> `src/windows/launcher/launcher.html`
  - `launcher.js` -> `src/windows/launcher/launcher.js`
  - `launcher.css` -> `src/windows/launcher/launcher.css`

3. Utility Files:

- `utils/datepicker.js` -> `src/renderer/utils/datepicker.js`
- `utils/saveUtils.js` -> `src/renderer/utils/saveUtils.js`
- `translations.json` -> `src/renderer/assets/translations.json`

4. Asset Files:

- All CSS files will be consolidated under `src/renderer/assets/css/`
- Images (like qrImage.jpg) will be moved to appropriate asset folders

## Implementation Steps

1. Create all required directories
2. Create backup of current files
3. Move files to new locations, updating imports and paths
4. Update package.json main entry point
5. Test basic application launch
6. Commit changes if successful

## Next Steps After Structure Creation

1. Begin implementing ConfigurationService
2. Create IPC channel constants
3. Update main process with new structure

Ready to switch to Code mode for implementation.
