Отлично! Приступаем к практической части рефакторинга.

**Шаг 1 и 2 (Частично): Подготовка Структуры, Перемещение Файлов и Обновление Путей**

Создадим новую структуру папок и переместим существующие файлы, обновляя базовые пути. На этом этапе мы **не будем** полностью реализовывать все сервисы и компоненты, а сосредоточимся на том, чтобы приложение *запускалось* в новой структуре, и основные связи были установлены. Логика внутри многих файлов пока останется прежней, но пути импорта/загрузки будут изменены.

**Новая структура и содержимое файлов:**

```text
./
├── build/                     # (Существующие ресурсы сборки)
├── canon/                     # (Существующее приложение Canon)
├── node_modules/
├── src/
│   ├── main/
│   │   ├── services/
│   │   │   ├── ConfigurationService.js  # (Переименованный и доработанный configLoader)
│   │   │   ├── IpcMainHandlers.js       # (Новый файл для обработчиков IPC)
│   │   │   └── PrintService.js          # (Новый файл, перенесем логику печати позже)
│   │   ├── utils/
│   │   │   └── FileSystemUtils.js     # (Новый файл для утилит ФС)
│   │   └── main.js              # (Обновленный)
│   │
│   ├── renderer/
│   │   ├── components/          # (Папки для компонентов созданы, реализация позже)
│   │   │   ├── Notification/
│   │   │   ├── Modal/
│   │   │   ├── FilePicker/
│   │   │   ├── GradientEditor/
│   │   │   ├── Countdown/
│   │   │   └── TabSwitcher/
│   │   ├── services/
│   │   │   ├── IpcRendererService.js # (Новый файл для оберток IPC)
│   │   │   ├── WebcamService.js      # (Новый файл, логика позже)
│   │   │   ├── CanonCameraService.js # (Новый файл, логика позже)
│   │   │   ├── LocalizationService.js# (Новый файл, логика позже)
│   │   │   └── ThemeService.js       # (Новый файл, логика позже)
│   │   ├── assets/
│   │   │   ├── css/              # (Предполагаем, что стили будут здесь)
│   │   │   │   ├── main.css
│   │   │   │   └── configurator.css # (Стили, специфичные для конфигуратора)
│   │   │   │   └── photobooth.css   # (Стили, специфичные для фотобудки)
│   │   │   │   └── launcher.css     # (Стили, специфичные для лаунчера)
│   │   │   ├── fonts/
│   │   │   ├── icons/
│   │   │   └── translations.json # (Перемещен)
│   │   ├── utils/
│   │   │   ├── DomUtils.js
│   │   │   ├── FormBindingUtils.js
│   │   │   ├── ValidationUtils.js
│   │   │   ├── datepicker.js     # (Перемещен)
│   │   │   └── saveUtils.js        # (Перемещен и обновлен)
│   │   └── renderer-preload.js   # (Опционально)
│   │
│   ├── shared/
│   │   ├── constants/
│   │   │   └── IpcChannels.js      # (Новый файл с константами)
│   │   └── utils/
│   │
│   └── windows/
│       ├── launcher/
│       │   ├── launcher.html     # (Новый/Обновленный)
│       │   ├── launcher.js       # (Перемещен и обновлен)
│       │   └── launcher.css      # (Перемещен) -> в assets?
│       ├── configurator/
│       │   ├── configurator.html # (Новый/Обновленный, бывший empty.html)
│       │   ├── configurator.js   # (Перемещен и обновлен, бывший empty.js)
│       │   └── configurator.css  # (Перемещен) -> в assets?
│       └── photobooth/
│           ├── photobooth.html   # (Новый/Обновленный, бывший index.html)
│           ├── photobooth.js     # (Перемещен и обновлен, бывший script.js)
│           └── photobooth.css    # (Перемещен) -> в assets?
│
├── config.json                # (Глобальный конфиг)
├── package.json               # (Обновлен main)
├── package-lock.json
└── README.md
```

**Содержимое измененных и новых файлов:**

**1. `package.json` (Обновлено поле `main`)**
```json
{
  "name": "photobooth-electron",
  "version": "1.0.0",
  "description": "Photobooth application using Electron",
  "main": "src/main/main.js", // <--- ОБНОВЛЕНО
  "scripts": {
    "start": "electron .",
    "build": "electron-builder"
  },
  "author": "MosPhotoBooth",
  "license": "MIT",
  "dependencies": {
    "child_process": "^1.0.2",
    "iconv-lite": "^0.6.3",
    "pdf-lib": "^1.17.1",
    "pdf-to-printer": "^5.6.0",
    "pdfkit": "^0.16.0",
    "qrcode": "^1.5.4",
    "sharp": "^0.33.5",
    "systeminformation": "^5.23.5"
  },
  "devDependencies": {
    "electron": "^25.9.8",
    "electron-builder": "^24.13.3"
  },
  "build": {
    "appId": "com.yourcompany.photobooth",
    "productName": "PhotoBooth",
    "directories": {
      "output": "dist", // Указываем папку для собранных файлов
      "buildResources": "build"
    },
    "files": [
      "src/**/*", // Включаем все из src
      "node_modules/**/*", // Включаем node_modules (builder сам отфильтрует)
      "package.json",
      "config.json", // Включаем глобальный конфиг
      "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}",
      "!**/node_modules/.bin",
      "!**/*.{o,hprof,orig,pyc,pyo,rbc}",
      "!**/._*",
      "!**/electron-builder.{yaml,yml,json,json5,toml}",
      "!**/node_modules/electron", // Исключаем сам электрон из сборки модулей
      "!**/node_modules/electron-builder", // Исключаем билдер
      "!**/node_modules/@types",
      "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
      "!**/test{,s}/**",
      "!**/tests/**",
      "!**/*.map"
      // "!**/src/**/*.ts", // Если нет TS
      // "!**/typings/**/*.d.ts",
      // "!**/typings"
    ],
    "win": {
      "target": [
        "nsis",
        "portable"
      ],
      "icon": "build/icon.ico",
      "signAndEditExecutable": false,
      "certificateFile": null
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "include": "build/installer.nsh",
      "createDesktopShortcut": true,
      "runAfterFinish": false,
      "perMachine": true,
      "allowElevation": true
    },
    "extraFiles": [
      {
        "from": "canon",
        "to": "canon",
        "filter": [
          "**/*", // Копируем все
          "!Server/pathExe.txt"
        ]
      },
      {
        "from": "build/dependencies/dotnet-runtime-9.0.2-win-x64.exe",
        "to": "resources/app-resources/dotnet-runtime-9.0.2-win-x64.exe" // Путь в ресурсах
      },
      {
        "from": "build/dependencies/aspnetcore-runtime-9.0.2-win-x64.exe",
        "to": "resources/app-resources/aspnetcore-runtime-9.0.2-win-x64.exe" // Путь в ресурсах
      }
    ]
  }
}
```

**2. `src/shared/constants/IpcChannels.js` (Новый)**
```javascript
// src/shared/constants/IpcChannels.js
const IpcChannels = {
  // Main -> Renderer
  SELECTED_FOLDER_PATH: 'selected-folder-path',
  CONFIG_UPDATE: 'config-update',
  CAMERA_CONTROL_STATUS: 'camera-control-status',
  PRINT_PHOTO_RESPONSE: 'print-photo-response', // Пример

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
  GET_CONFIG: 'get-config', // Может быть заменен на get-current-config
  GET_CURRENT_CONFIG: 'get-current-config',
  SELECT_FILE: 'select-file',
  RELOAD_OPEN_WINDOWS: 'reload-open-windows',
  GET_PRINTERS: 'get-printers',
  CONFIG_UPDATED: 'config-updated', // Renderer -> Main (уведомление об обновлении)
  CAMERA_MODE_CHANGED: 'camera-mode-changed', // Renderer -> Main (уведомление об изменении режима камеры)

  // Добавьте другие каналы по мере необходимости
};

// Используем `module.exports` для совместимости с require в Electron без Babel/Webpack
module.exports = IpcChannels;
```

**3. `src/main/services/ConfigurationService.js` (Переименованный и обновленный `utils/configLoader.js`)**
```javascript
// src/main/services/ConfigurationService.js
const fs = require("fs");
const path = require("path");

const GLOBAL_CONFIG_FILENAME = "config.json"; // Глобальный конфиг теперь в корне
const EVENT_CONFIG_FILENAME = "config.json";

class ConfigurationService {
    constructor() {
        this.basePath = process.cwd(); // По умолчанию - текущая директория
        this.globalConfigPath = path.join(this.basePath, GLOBAL_CONFIG_FILENAME);
        this.currentConfig = this.loadInitialConfig();
        console.log("[ConfigService] Initialized.");
        // console.log("[ConfigService] Initial config:", this.currentConfig);
    }

    loadInitialConfig() {
        let config = { camera_rotation: 0 }; // Start with minimal defaults
        config.basePath = this.basePath; // Set initial basePath

        // Try loading global config
        try {
            if (fs.existsSync(this.globalConfigPath)) {
                const globalData = fs.readFileSync(this.globalConfigPath, "utf8");
                const parsedGlobal = JSON.parse(globalData);
                config = { ...config, ...parsedGlobal }; // Merge global over defaults
                config.basePath = this.basePath; // Ensure basePath isn't overridden by global file
                console.log(`[ConfigService] Global config loaded from: ${this.globalConfigPath}`);
            } else {
                console.warn(`[ConfigService] Global config not found at: ${this.globalConfigPath}. Using defaults.`);
                // Create a default global config if it doesn't exist? Optional.
                // fs.writeFileSync(this.globalConfigPath, JSON.stringify({ basePath: this.basePath, cameraMode: 'pc' }, null, 2), 'utf8');
            }
        } catch (error) {
            console.error(`[ConfigService] Error loading global config: ${error.message}`);
        }

        this.processConfigInterpolation(config, config.basePath);
        this.ensureConfigDefaults(config); // Apply defaults after loading global
        return config;
    }

    loadConfigForEvent(selectedFolderPath) {
        console.log(`[ConfigService] Loading config for event: ${selectedFolderPath}`);
        let eventConfig = {};
        let finalConfig = { ...this.currentConfig }; // Start with current (likely global)

        if (selectedFolderPath) {
            // CRITICAL: Always set basePath to the selected folder path
            finalConfig.basePath = selectedFolderPath;
             console.log(`[ConfigService] Setting basePath to event folder: ${selectedFolderPath}`);

            const eventConfigPath = path.join(selectedFolderPath, EVENT_CONFIG_FILENAME);
            try {
                if (fs.existsSync(eventConfigPath)) {
                    const eventData = fs.readFileSync(eventConfigPath, "utf8");
                    eventConfig = JSON.parse(eventData);
                    // Merge event config over the current config
                    finalConfig = { ...finalConfig, ...eventConfig };
                     // Ensure basePath remains the event folder path
                    finalConfig.basePath = selectedFolderPath;
                    console.log(`[ConfigService] Event config loaded and merged from: ${eventConfigPath}`);
                } else {
                    console.log(`[ConfigService] No event config found at ${eventConfigPath}. Using previously loaded config with updated basePath.`);
                }
            } catch (error) {
                console.error(`[ConfigService] Error loading event config: ${error.message}`);
                 // Fallback to current config but ensure basePath is the event folder
                finalConfig.basePath = selectedFolderPath;
            }
        } else {
             console.log("[ConfigService] No event folder path provided, returning current config.");
             // If no event path, ensure we use the initial base path
             finalConfig.basePath = this.basePath;
        }


        this.processConfigInterpolation(finalConfig, finalConfig.basePath);
        this.ensureConfigDefaults(finalConfig);
        this.currentConfig = finalConfig; // Update the service's current config
        // console.log("[ConfigService] Final config after event load:", this.currentConfig);
        return this.currentConfig;
    }

     saveEventConfig(folderPath, dataToSave) {
        if (!folderPath) {
            console.error("[ConfigService] Cannot save event config without folderPath.");
            throw new Error("Event folder path is required.");
        }
        const eventConfigPath = path.join(folderPath, EVENT_CONFIG_FILENAME);
        try {
            let existingConfig = {};
            if (fs.existsSync(eventConfigPath)) {
                const eventData = fs.readFileSync(eventConfigPath, "utf8");
                existingConfig = JSON.parse(eventData);
            }
            // Merge new data over existing config
            const updatedConfig = { ...existingConfig, ...dataToSave };
            // Ensure basePath is NOT saved into the event config file itself
            delete updatedConfig.basePath;

            fs.writeFileSync(eventConfigPath, JSON.stringify(updatedConfig, null, 2), 'utf8');
            console.log(`[ConfigService] Event config saved successfully to: ${eventConfigPath}`);

            // If the saved folder is the currently active one, reload the config in memory
            if (global.selectedFolderPath === folderPath) {
                 console.log("[ConfigService] Reloading current config after save.");
                 this.loadConfigForEvent(folderPath);
            }
             return true;
        } catch (error) {
            console.error(`[ConfigService] Error saving event config to ${eventConfigPath}:`, error);
            throw error;
        }
    }

     saveGlobalConfig(dataToSave) {
        try {
            let existingGlobalConfig = {};
             if (fs.existsSync(this.globalConfigPath)) {
                const globalData = fs.readFileSync(this.globalConfigPath, "utf8");
                existingGlobalConfig = JSON.parse(globalData);
            }
             // Merge new data over existing global config
            const updatedGlobalConfig = { ...existingGlobalConfig, ...dataToSave };

            // Ensure basePath is NOT saved into the global config file
            delete updatedGlobalConfig.basePath;

            fs.writeFileSync(this.globalConfigPath, JSON.stringify(updatedGlobalConfig, null, 2), 'utf8');
            console.log(`[ConfigService] Global config saved successfully to: ${this.globalConfigPath}`);

             // Update the current config in memory partly
             this.currentConfig = { ...this.currentConfig, ...dataToSave };
             // Re-process interpolation and defaults if needed, though global changes are usually minor
             this.processConfigInterpolation(this.currentConfig, this.currentConfig.basePath);
             this.ensureConfigDefaults(this.currentConfig);

             return true;
        } catch (error) {
            console.error(`[ConfigService] Error saving global config to ${this.globalConfigPath}:`, error);
            throw error;
        }
    }


    getCurrentConfig() {
        // Return a copy to prevent direct modification
        return { ...this.currentConfig };
    }

    // --- Helper methods (moved from original loadConfig/main.js) ---

    processConfigInterpolation(obj, basePathToUse) {
        if (!obj || typeof obj !== 'object') return;
        // console.log(`[ConfigService] Interpolating with basePath: ${basePathToUse}`); // Debug

        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];

                if (typeof value === 'string') {
                    if (value.includes('{{basePath}}')) {
                        if (!basePathToUse) {
                            console.warn(`[ConfigService] Warning: Attempting to interpolate {{basePath}} but basePath is empty for key: ${key}. Using '.'`);
                            obj[key] = value.replace(/{{basePath}}/g, '.');
                        } else {
                             // Ensure backslashes are normalized ONLY IF basePath contains them
                             const normalizedBasePath = basePathToUse.replace(/\\/g, '/');
                             obj[key] = value.replace(/{{basePath}}/g, normalizedBasePath).replace(/\\/g, '/'); // Replace and normalize
                        }
                        // console.log(`[ConfigService] Interpolated ${key}: ${obj[key]}`); // Debug
                    } else if (['logoPath', 'brandLogoPath', 'backgroundImage'].includes(key) || key.endsWith('Path') || key.endsWith('Dir')) {
                         // Handle paths that might be relative *without* {{basePath}}
                        if (value && !path.isAbsolute(value) && basePathToUse) {
                            obj[key] = path.join(basePathToUse, value).replace(/\\/g, '/');
                             // console.log(`[ConfigService] Resolved relative path for ${key}: ${obj[key]}`); // Debug
                        } else if(value) {
                             obj[key] = value.replace(/\\/g, '/'); // Normalize absolute paths
                        }
                    }
                } else if (typeof value === 'object' && value !== null) {
                    this.processConfigInterpolation(value, basePathToUse); // Recurse
                }
            }
        }
         // Ensure stylesDir is correctly derived if not explicitly set or interpolated
        if (!obj.stylesDir && basePathToUse) {
           obj.stylesDir = path.join(basePathToUse, "styles").replace(/\\/g, "/");
           console.log(`[ConfigService] Derived default stylesDir: ${obj.stylesDir}`);
        } else if (obj.stylesDir) {
            obj.stylesDir = obj.stylesDir.replace(/\\/g, "/"); // Normalize just in case
        }

    }

    ensureConfigDefaults(config) {
        // Same logic as before in main.js ensureConfigDefaults
        config.PaperSizeX = Number(config.paperSizeWidth) || 105; // A6 default width in mm? Changed from pixels
        config.PaperSizeY = Number(config.paperSizeHeight) || 148; // A6 default height in mm?
        config.PDForientation = config.orientation === 'landscape' ? 'horizon' : 'vertical'; // Map orientation
        config.borderPrintImage = config.borderPrintImage === true;
        config.printButtonVisible = config.printButtonVisible !== false; // Default true
        config.defaultPrinter = config.defaultPrinter || "";

        config.prePhotoTimer = Number(config.prePhotoTimer) || 4;
        config.inactivityTimeout = Number(config.inactivityTimeout) || 60000;
        config.showStyleNames = config.showStyleNames !== false; // Default true
        config.visibilityAgree = config.visibilityAgree === true;

        config.camera_rotation = config.camera_rotation != null ? Number(config.camera_rotation) : 0;
        config.send_image_rotation = config.send_image_rotation != null ? Number(config.send_image_rotation) : 0;
        config.isEvf = config.isEvf === true;
        config.cameraMode = config.cameraMode || 'pc';

        config.mainLogoScale = Number(config.mainLogoScale) || 1;
        config.logoScale = Number(config.logoScale) || 1;
        config.logoOffsetX = Number(config.logoOffsetX) || 0; // Renamed from logo_pos_x? Check config.json usage
        config.logoOffsetY = Number(config.logoOffsetY) || 0; // Renamed from logo_pos_y? Check config.json usage
        config.theme = config.theme || "light";
        config.backdropBlur = config.backdropBlur || "0px";
        config.animationEnabled = config.animationEnabled !== false; // Default true

        config.language = config.language || { current: "ru", showSwitcher: false };
        config.language.current = config.language.current || "ru";
        config.language.showSwitcher = config.language.showSwitcher === true;

        config.allowMultipleGenderSelection = config.allowMultipleGenderSelection === true;
        // Ensure allowedGenders structure is valid array, default if not
         if (!Array.isArray(config.allowedGenders) || config.allowedGenders.length === 0 || !config.allowedGenders.every(g => Array.isArray(g))) {
             console.warn("[ConfigService] Invalid allowedGenders structure found, resetting to default.");
            config.allowedGenders = [["man", "woman"], ["boy", "girl"], ["group"]]; // Default structure
        }

        config.lightTheme = config.lightTheme || {};
        config.lightTheme.backgroundColor = config.lightTheme.backgroundColor || '#ffebcd';
        config.lightTheme.backgroundImage = config.lightTheme.backgroundImage || '';
        config.lightTheme.lightTextColor = config.lightTheme.lightTextColor || '#000000';

        config.darkTheme = config.darkTheme || {};
        config.darkTheme.backgroundColor = config.darkTheme.backgroundColor || '#000000';
        config.darkTheme.backgroundImage = config.darkTheme.backgroundImage || '';
        config.darkTheme.darkTextColor = config.darkTheme.darkTextColor || '#ffffff';

        config.hotFolder = config.hotFolder || { enabled: false, path: '' };
        config.hotFolder.enabled = config.hotFolder.enabled === true;
        config.hotFolder.path = config.hotFolder.path || '';

        // Add any other necessary defaults...
    }
}

// Export a single instance (Singleton pattern)
module.exports = new ConfigurationService();
```

**4. `src/main/services/IpcMainHandlers.js` (Новый - Начальная структура)**
```javascript
// src/main/services/IpcMainHandlers.js
const { ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { print, getPrinters } = require("pdf-to-printer"); // Keep print logic here for now
const PDFDocument = require("pdfkit");
const os = require("os");

const ConfigurationService = require("./ConfigurationService"); // Импортируем сервис
const IpcChannels = require("../../shared/constants/IpcChannels");

// Перенесем логику печати сюда позже, пока оставим как есть
async function createPdf(tempImagePath, tempPdfPath, isLandscape, config) {
   console.log("Добавление логотипа в PDF...");
   return new Promise((resolve, reject) => {
       try {
            // Используем значения из переданного конфига
           const PaperSizeX = Number(config.paperSizeWidth) || 105; // mm
           const PaperSizeY = Number(config.paperSizeHeight) || 148; // mm
           const MM_TO_PT = 2.83465; // Коэффициент перевода мм в пункты (1pt = 1/72 inch, 1 inch = 25.4 mm)
           const A6WidthPt = PaperSizeX * MM_TO_PT;
           const A6HeightPt = PaperSizeY * MM_TO_PT;

           const A6 = [A6WidthPt, A6HeightPt];
           const A6Landscape = [A6HeightPt, A6WidthPt];


           const pdfOrientation = config.orientation === "landscape" ? "horizon" : "vertical";
           const pageSize = pdfOrientation === "horizon" ? A6Landscape : A6;

           const doc = new PDFDocument({
               size: pageSize,
               margins: { top: 0, bottom: 0, left: 0, right: 0 },
           });

           const writeStream = fs.createWriteStream(tempPdfPath);
           doc.pipe(writeStream);

           console.log("Чтение файла изображения...");
           const extension = path.extname(tempImagePath).toLowerCase();
           if (extension !== ".jpg" && extension !== ".jpeg" && extension !== ".png") {
               throw new Error(`Неподдерживаемый формат изображения: ${extension}`);
           }

           const rotateImage =
               (pdfOrientation === "horizon" && !isLandscape) ||
               (pdfOrientation === "vertical" && isLandscape);

            const borderPrintImage = config.borderPrintImage === true; // Убедимся, что это boolean

           if (!borderPrintImage) {
               // Логика "cover"
               const pageW = pageSize[0];
               const pageH = pageSize[1];
                let targetW = pageW, targetH = pageH; // По умолчанию - размер страницы

                if (rotateImage) {
                    // Если поворачиваем, целевые размеры меняются местами
                    targetW = pageH;
                    targetH = pageW;
                }

                const img = doc.openImage(tempImagePath);
                const imgW = img.width;
                const imgH = img.height;
                let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

                const targetRatio = targetW / targetH;
                const imgRatio = imgW / imgH;

                 if (imgRatio > targetRatio) { // Изображение шире, чем целевая область
                    drawHeight = targetH;
                    drawWidth = imgRatio * drawHeight;
                    offsetX = -(drawWidth - targetW) / 2; // Центрируем по X
                } else { // Изображение выше (или такое же), чем целевая область
                    drawWidth = targetW;
                    drawHeight = drawWidth / imgRatio;
                    offsetY = -(drawHeight - targetH) / 2; // Центрируем по Y
                }

                 doc.save();
                 // Клиппинг по целевым размерам
                 doc.rect(0, 0, targetW, targetH).clip();

                 if (rotateImage) {
                    // Поворот относительно центра *целевой* области
                     const centerX = targetW / 2;
                     const centerY = targetH / 2;
                     doc.translate(centerX, centerY);
                     doc.rotate(90);
                     doc.translate(-centerX, -centerY);
                     // Координаты для повернутого изображения (относительно повернутой системы)
                     // Нужно вычислить offsetX и offsetY для повернутого случая
                    // Пересчитываем offsetX/offsetY для повернутого изображения
                     if (imgRatio > targetRatio) { // Изображение шире -> было центрировано по X
                         offsetY = -(drawWidth - targetW) / 2; // Теперь Y
                         offsetX = 0;
                     } else { // Изображение выше -> было центрировано по Y
                         offsetX = -(drawHeight - targetH) / 2; // Теперь X
                         offsetY = 0;
                     }
                     // Рисуем с новыми смещениями в повернутой системе
                     doc.image(tempImagePath, offsetX, offsetY, { width: drawWidth, height: drawHeight });

                 } else {
                    // Без поворота
                    doc.image(tempImagePath, offsetX, offsetY, { width: drawWidth, height: drawHeight });
                 }
                doc.restore();


           } else {
               // Логика "fit" (как было раньше)
               if (rotateImage) {
                   const pageW = pageSize[0], pageH = pageSize[1];
                   const centerX = pageW / 2, centerY = pageH / 2;
                   doc.rotate(90, { origin: [centerX, centerY] });
                   doc.image(tempImagePath, 0, -pageW, { fit: [pageH, pageW], align: "center", valign: "center" });
                   doc.rotate(-90, { origin: [centerX, centerY] });
               } else {
                   doc.image(tempImagePath, 0, 0, { fit: pageSize, align: "center", valign: "center" });
               }
           }

           console.log("Завершаю создание PDF...");
           doc.end();

           writeStream.on("finish", () => {
               console.log(`PDF успешно создан: ${tempPdfPath}`);
               resolve(tempPdfPath);
           });

           writeStream.on("error", (err) => {
               console.error("Ошибка при записи PDF:", err);
               reject(err);
           });
       } catch (error) {
           console.error("Не удалось создать PDF:", error);
           reject(error);
       }
   });
}


function initializeIpcHandlers() {
    console.log("[IPC] Initializing Main Handlers...");

    ipcMain.handle(IpcChannels.GET_CURRENT_CONFIG, () => {
        return ConfigurationService.getCurrentConfig();
    });

    ipcMain.on(IpcChannels.GET_SELECTED_FOLDER, (event) => {
        // global.selectedFolderPath устанавливается в main.js
        event.returnValue = global.selectedFolderPath || null;
    });

     ipcMain.on(IpcChannels.SELECTED_FOLDER, (event, folderPath) => {
         // Логика установки папки останется в main.js (setSelectedFolder)
         // Но можно вызывать ее отсюда, если потребуется
         console.log(`[IPC] Received ${IpcChannels.SELECTED_FOLDER}: ${folderPath}. Forwarding to main...`);
         if (global.setSelectedFolder) { // Проверяем, что функция доступна
             global.setSelectedFolder(folderPath);
         } else {
              console.error("[IPC] global.setSelectedFolder is not defined in main.js!");
         }
    });

    ipcMain.on(IpcChannels.SELECT_FILE, (event, options) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        const result = dialog.showOpenDialogSync(window, options); // Передаем окно для модальности
        event.returnValue = {
            canceled: !result,
            filePaths: result || []
        };
    });

    ipcMain.handle(IpcChannels.GET_PRINTERS, async () => {
        try {
            const printers = await getPrinters();
            return printers;
        } catch (error) {
            console.error('[IPC] Error getting printers:', error);
            return [];
        }
    });

     ipcMain.on(IpcChannels.CONFIG_UPDATED, (event, folderPath) => {
         console.log(`[IPC] Received ${IpcChannels.CONFIG_UPDATED} for: ${folderPath}`);
         // Перезагружаем конфиг, только если папка активна
         if (folderPath && folderPath === global.selectedFolderPath) {
             console.log(`[IPC] Reloading config for active folder: ${folderPath}`);
             const newConfig = ConfigurationService.loadConfigForEvent(folderPath);
             // Уведомить окна об обновлении (логика будет в main.js)
             if (global.notifyWindowsOfConfigUpdate) {
                 global.notifyWindowsOfConfigUpdate(newConfig);
             }
         } else {
             console.log(`[IPC] Config update for inactive folder (${folderPath}), ignoring reload.`);
         }
     });

     ipcMain.on(IpcChannels.CAMERA_MODE_CHANGED, (event, cameraMode) => {
         console.log(`[IPC] Received ${IpcChannels.CAMERA_MODE_CHANGED}: ${cameraMode}`);
         // Можно обновить текущий конфиг в памяти или передать дальше
         ConfigurationService.currentConfig.cameraMode = cameraMode;
         // Уведомить main.js, если нужно что-то сделать с камерой Canon
          if (global.handleCameraModeChange) {
                global.handleCameraModeChange(cameraMode);
            }
     });

     // Обработчик печати
     ipcMain.on(IpcChannels.PRINT_PHOTO, async (event, data) => {
        const config = ConfigurationService.getCurrentConfig(); // Получаем актуальный конфиг

        if (!data || !data.imageData) {
            console.error("[PrintService] Ошибка: imageData не предоставлен или неверный.");
            event.reply(IpcChannels.PRINT_PHOTO_RESPONSE, false); // Отвечаем об ошибке
            return;
        }

        const { imageData, isLandscape } = data;
        console.log(`[PrintService] Image orientation: ${isLandscape ? "landscape" : "portrait"}`);

        let tempDir = null; // Initialize outside try
        try {
            tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "print-"));
            const imageFileName = "image.jpg"; // Assume jpg for simplicity or detect
            const pdfFileName = "print.pdf";
            const tempImagePath = path.join(tempDir, imageFileName);
            const tempPdfPath = path.join(tempDir, pdfFileName);

            let buffer;
            if (imageData.startsWith('http')) {
                 const response = await fetch(imageData);
                  if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
                 const arrayBuffer = await response.arrayBuffer();
                 buffer = Buffer.from(arrayBuffer);
            } else if (imageData.startsWith('data:image')) {
                 buffer = Buffer.from(imageData.split(",")[1], 'base64');
            } else {
                 // Assume it's a file path? Be cautious here.
                 // For now, throw error if not http or data url
                 throw new Error("Unsupported image data format for printing.");
            }


            fs.writeFileSync(tempImagePath, buffer);
            console.log(`[PrintService] Изображение сохранено: ${tempImagePath}`);

            // Генерация PDF
            const generatedPdfPath = await createPdf(tempImagePath, tempPdfPath, isLandscape, config);
            console.log(`[PrintService] Путь сгенерированного PDF: ${generatedPdfPath}`);

            const printOptions = {
                scale: "fit",
                silent: true,
                // orientation: config.PDForientation === 'horizon' ? 'landscape' : 'portrait' // pdf-to-printer might use this
            };

            if (config.defaultPrinter) {
                console.log(`[PrintService] Using specified printer: ${config.defaultPrinter}`);
                printOptions.printer = config.defaultPrinter;
            } else {
                 console.log('[PrintService] Using system default printer');
                 const defaultPrinter = await getDefaultPrinter();
                 if (defaultPrinter) {
                     console.log(`[PrintService] System default printer: ${defaultPrinter.name}`);
                     // No need to set options.printer if it's the default
                 } else {
                      console.warn("[PrintService] No default printer found.");
                 }
            }


            // Печать PDF
            await print(generatedPdfPath, printOptions);
            console.log("[PrintService] Печать инициирована.");
            event.reply(IpcChannels.PRINT_PHOTO_RESPONSE, true); // Отвечаем об успехе

        } catch (error) {
            console.error("[PrintService] Ошибка в процессе печати:", error);
             event.reply(IpcChannels.PRINT_PHOTO_RESPONSE, false); // Отвечаем об ошибке
        } finally {
            // Удаление временных файлов
            if (tempDir && fs.existsSync(tempDir)) {
                 try {
                     fs.rmSync(tempDir, { recursive: true, force: true }); // Use rmSync for modern Node
                     console.log("[PrintService] Временные файлы удалены.");
                 } catch (cleanupError) {
                     console.error("[PrintService] Ошибка при удалении временных файлов:", cleanupError);
                 }
             }
        }
    });


    // Добавьте другие обработчики...
    console.log("[IPC] Main Handlers Initialized.");
}

module.exports = { initializeIpcHandlers };
```

**5. `src/main/main.js` (Обновленный)**
```javascript
// src/main/main.js
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
// const PDFDocument = require("pdfkit"); // Логика PDF переехала (частично) в IpcMainHandlers
// const { print, getDefaultPrinter } = require("pdf-to-printer"); // Логика печати переехала в IpcMainHandlers
const si = require("systeminformation");
const { exec, execSync } = require("child_process");

// --- ИМПОРТ СЕРВИСОВ И КОНСТАНТ ---
const ConfigurationService = require("./services/ConfigurationService");
const { initializeIpcHandlers } = require("./services/IpcMainHandlers"); // Импортируем инициализатор
const IpcChannels = require("../shared/constants/IpcChannels");
// --- КОНЕЦ ИМПОРТОВ ---

// Define global variable for selected folder path
// Сделаем его объектом для хранения состояния
global.appState = {
    selectedFolderPath: null,
    config: ConfigurationService.getCurrentConfig(), // Инициализируем начальным конфигом
    mainWindow: null,
    launcherWindow: null,
    configuratorWindow: null, // Переименовали emptyWindow
    cameraCheckInterval: null,
    isCanonRunning: false, // Флаг для отслеживания запущен ли Canon
};
// Для обратной совместимости пока оставим
global.selectedFolderPath = null;

// --- ОБНОВЛЕНИЕ КОНФИГА В СОСТОЯНИИ ---
function updateGlobalConfigState(newConfig) {
     global.appState.config = newConfig;
     // Уведомить окна об обновлении
     notifyWindowsOfConfigUpdate(newConfig);
}

// --- ФУНКЦИИ УПРАВЛЕНИЯ ОКНАМИ ---
function createLauncherWindow() {
    if (global.appState.launcherWindow) return; // Не создавать, если уже есть

    global.appState.launcherWindow = new BrowserWindow({
        width: 900,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            // Указываем путь к скрипту окна
            preload: path.join(__dirname, '../renderer/renderer-preload.js') // Пример preload, если нужен
        }
    });

    // Загружаем HTML окна
    global.appState.launcherWindow.loadFile(path.join(__dirname, '../windows/launcher/launcher.html'));

    global.appState.launcherWindow.on('closed', () => {
        console.log("[Window] Launcher closed.");
        global.appState.launcherWindow = null;
        // Закрыть другие окна при закрытии лаунчера? Решить по логике.
        if (global.appState.mainWindow) global.appState.mainWindow.close();
        if (global.appState.configuratorWindow) global.appState.configuratorWindow.close();
         // Если все окна закрыты (кроме лаунчера), завершить приложение
        if (BrowserWindow.getAllWindows().length === 0) {
             // app.quit(); // Убрано, т.к. есть window-all-closed
        }

    });
}

function createPhotoboothWindow(folderPath) {
     if (global.appState.mainWindow) {
         console.log("[Window] Photobooth window already exists. Focusing or reloading.");
         if (global.selectedFolderPath !== folderPath) {
              setSelectedFolder(folderPath); // Обновит конфиг и уведомит окно
         }
         global.appState.mainWindow.show();
         global.appState.mainWindow.focus();
         return;
     };

    console.log('[Window] Creating Photobooth window with folder path:', folderPath);
    setSelectedFolder(folderPath); // Устанавливаем папку и грузим конфиг ПЕРЕД созданием окна

    global.appState.mainWindow = new BrowserWindow({
        width: 1080,
        height: 1440,
        show: false, // Показывать будем позже
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            // preload: path.join(__dirname, '../renderer/renderer-preload.js') // Если нужен
        },
        autoHideMenuBar: true,
    });

    global.appState.mainWindow.setMenuBarVisibility(false);
    global.appState.mainWindow.loadFile(path.join(__dirname, '../windows/photobooth/photobooth.html'));

    global.appState.mainWindow.webContents.on("did-finish-load", () => {
        console.log("[Window] Photobooth window finished loading.");
        global.appState.mainWindow.webContents.setZoomFactor(1);
        // Отправляем путь и конфиг после загрузки
        if (global.selectedFolderPath) {
            global.appState.mainWindow.webContents.send(IpcChannels.SELECTED_FOLDER_PATH, global.selectedFolderPath);
            global.appState.mainWindow.webContents.send(IpcChannels.CONFIG_UPDATE, global.appState.config);
            console.log(`[Window] Sent initial path and config to Photobooth window.`);
        }
         // Запускаем камеру Canon, если нужно, ПОСЛЕ загрузки окна и конфига
         startCanonCameraIfNeeded();
         global.appState.mainWindow.show(); // Показываем окно
    });

    global.appState.mainWindow.on("closed", () => {
        console.log("[Window] Photobooth window closed.");
        global.appState.mainWindow = null;
         stopCanonCameraIfNeeded(); // Остановить Canon при закрытии окна
    });

    global.appState.mainWindow.on("error", (error) => {
        console.error("[Window] Photobooth window error:", error);
    });
}

function createConfiguratorWindow(folderPath) {
      if (global.appState.configuratorWindow) {
         console.log("[Window] Configurator window already exists. Focusing or reloading.");
         if (global.selectedFolderPath !== folderPath) {
              setSelectedFolder(folderPath); // Обновит конфиг и уведомит окно
         }
         global.appState.configuratorWindow.show();
         global.appState.configuratorWindow.focus();
         return;
     };

    console.log('[Window] Creating Configurator window with folder path:', folderPath);
    setSelectedFolder(folderPath); // Устанавливаем папку и грузим конфиг ПЕРЕД созданием окна

    global.appState.configuratorWindow = new BrowserWindow({
        width: 1080, // Размеры могут быть другими
        height: 900,
         show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            // preload: path.join(__dirname, '../renderer/renderer-preload.js')
        }
    });

    global.appState.configuratorWindow.loadFile(path.join(__dirname, '../windows/configurator/configurator.html'));

    global.appState.configuratorWindow.webContents.on("did-finish-load", () => {
        console.log("[Window] Configurator window finished loading.");
         // Отправляем путь и конфиг после загрузки
        if (global.selectedFolderPath) {
            global.appState.configuratorWindow.webContents.send(IpcChannels.SELECTED_FOLDER_PATH, global.selectedFolderPath);
            global.appState.configuratorWindow.webContents.send(IpcChannels.CONFIG_UPDATE, global.appState.config); // Отправляем и сюда конфиг
             console.log(`[Window] Sent initial path and config to Configurator window.`);
        }
        global.appState.configuratorWindow.show();
    });

    global.appState.configuratorWindow.on('closed', () => {
        console.log("[Window] Configurator window closed.");
        global.appState.configuratorWindow = null;
    });
     global.appState.configuratorWindow.on("error", (error) => {
        console.error("[Window] Configurator window error:", error);
    });
}

// --- УПРАВЛЕНИЕ КАМЕРОЙ CANON ---
function startCanonCameraIfNeeded() {
    if (global.appState.config?.cameraMode === "canon" && !global.appState.isCanonRunning) {
        console.log("[Canon] Starting Canon camera processes...");
        try {
             // Указываем правильный рабочий каталог
             const canonAppDir = path.resolve(app.getAppPath(), '..', 'canon'); // Путь к папке canon рядом с app.asar
             console.log(`[Canon] Canon App Directory: ${canonAppDir}`);

             if (!fs.existsSync(path.join(canonAppDir, 'start.bat'))) {
                 console.error(`[Canon] start.bat not found in ${canonAppDir}`);
                 dialog.showErrorBox("Ошибка Canon", `Файл start.bat не найден в ${canonAppDir}`);
                 return;
             }

            exec("start.bat", { cwd: canonAppDir }, (error, stdout, stderr) => {
                if (error) {
                    console.error("[Canon] Failed to start Canon camera:", error);
                     dialog.showErrorBox("Ошибка Canon", `Не удалось запустить Canon камеру: ${error.message}`);
                    return;
                }
                console.log("[Canon] start.bat stdout:", stdout || "N/A");
                 console.error("[Canon] start.bat stderr:", stderr || "N/A");
                global.appState.isCanonRunning = true; // Предполагаем успех, проверка ниже
                 // Start the camera check interval only after attempting to start
                 if (!global.appState.cameraCheckInterval) {
                     global.appState.cameraCheckInterval = setInterval(checkCameraControlProcess, 2000); // Check more frequently initially
                 }
            });
        } catch (err) {
             console.error("[Canon] Error executing start.bat:", err);
             dialog.showErrorBox("Ошибка Canon", `Ошибка запуска start.bat: ${err.message}`);
        }

    } else if (global.appState.config?.cameraMode === "canon" && global.appState.isCanonRunning) {
         console.log("[Canon] Canon processes already considered running.");
         // Ensure check interval is running if needed
          if (!global.appState.cameraCheckInterval) {
                global.appState.cameraCheckInterval = setInterval(checkCameraControlProcess, 5000); // Check less frequently if already running
            }
    }
}

function stopCanonCameraIfNeeded() {
     if (global.appState.config?.cameraMode === "canon" && global.appState.isCanonRunning) {
        console.log("[Canon] Stopping Canon camera processes...");
         if (global.appState.cameraCheckInterval) {
             clearInterval(global.appState.cameraCheckInterval);
             global.appState.cameraCheckInterval = null;
         }
         try {
             // Эти команды могут требовать прав администратора
             execSync("taskkill /IM Api.exe /F");
             execSync("taskkill /IM CameraControl.exe /F");
             execSync("taskkill /IM CameraControllerClient.exe /F");
             console.log("[Canon] Processes stopped via taskkill.");
             global.appState.isCanonRunning = false;
             notifyWindowsOfCanonStatus(false);
         } catch (error) {
             console.error("[Canon] Failed to stop Canon processes (maybe not running or permission issue):", error.message);
              // Все равно считаем, что остановлено или не было запущено
             global.appState.isCanonRunning = false;
             notifyWindowsOfCanonStatus(false);
         }
     }
}

// Проверка процесса CameraControl.exe
function checkCameraControlProcess() {
    exec('tasklist /FI "IMAGENAME eq CameraControl.exe"', (error, stdout, stderr) => {
        if (error) {
            // console.warn("[Canon] Error executing tasklist (might be normal if process not running):", error.message);
            if (global.appState.isCanonRunning) {
                 console.log("[Canon] CameraControl.exe seems to have stopped.");
                 global.appState.isCanonRunning = false;
                 notifyWindowsOfCanonStatus(false);
            }
            return;
        }
        const isRunning = stdout.toLowerCase().includes("cameracontrol.exe");
         if (isRunning && !global.appState.isCanonRunning) {
             console.log("[Canon] CameraControl.exe detected running.");
             global.appState.isCanonRunning = true;
             notifyWindowsOfCanonStatus(true);
              // Можно замедлить проверку, раз нашли
             if (global.appState.cameraCheckInterval) {
                 clearInterval(global.appState.cameraCheckInterval);
                 global.appState.cameraCheckInterval = setInterval(checkCameraControlProcess, 10000); // Check less often
             }
         } else if (!isRunning && global.appState.isCanonRunning) {
             console.log("[Canon] CameraControl.exe detected stopped.");
             global.appState.isCanonRunning = false;
             notifyWindowsOfCanonStatus(false);
         }
         // Если состояние не изменилось, ничего не делаем
    });
}

function notifyWindowsOfCanonStatus(isRunning) {
     const windows = [global.appState.mainWindow, global.appState.configuratorWindow];
     windows.forEach(win => {
         if (win && win.webContents) {
             win.webContents.send(IpcChannels.CAMERA_CONTROL_STATUS, isRunning);
         }
     });
}

function notifyWindowsOfConfigUpdate(newConfig) {
    const windows = [global.appState.mainWindow, global.appState.configuratorWindow, global.appState.launcherWindow];
     windows.forEach(win => {
         if (win && win.webContents) {
             console.log(`[IPC] Sending config update to window ID: ${win.id}`);
             win.webContents.send(IpcChannels.CONFIG_UPDATE, newConfig);
         }
     });
}

// --- УПРАВЛЕНИЕ СОСТОЯНИЕМ И КОНФИГОМ ---
// Функция для установки выбранной папки (вызывается из IPC)
// Сделаем ее доступной глобально для IpcMainHandlers
global.setSelectedFolder = (folderPath) => {
    console.log('[State] Setting selected folder:', folderPath);
    if (!folderPath) {
        console.warn('[State] Attempted to set undefined folder path');
        global.selectedFolderPath = null; // Устанавливаем в null
        global.appState.selectedFolderPath = null;
         // Загружаем только глобальный конфиг
         updateGlobalConfigState(ConfigurationService.loadInitialConfig());
        return;
    }

    global.selectedFolderPath = folderPath;
    global.appState.selectedFolderPath = folderPath;

    try {
        // Перезагружаем конфиг с новой папкой
       const newConfig = ConfigurationService.loadConfigForEvent(folderPath);
       updateGlobalConfigState(newConfig); // Обновляем состояние и уведомляем окна
        // debugAppState(); // Для отладки
    } catch (error) {
        console.error('[State] Error loading config for folder:', error);
        // В случае ошибки можно загрузить только глобальный?
         updateGlobalConfigState(ConfigurationService.loadInitialConfig());
    }
};

// --- ГЛОБАЛЬНЫЕ ОБРАБОТЧИКИ ДЛЯ IPC ---
// Доступ к этим функциям из IpcMainHandlers.js через global
global.notifyWindowsOfConfigUpdate = notifyWindowsOfConfigUpdate;
global.handleCameraModeChange = (cameraMode) => {
     // Если режим изменился на Canon, пытаемся запустить
     if (cameraMode === 'canon') {
          startCanonCameraIfNeeded();
     } else {
         // Если режим изменился НЕ на Canon, останавливаем
          stopCanonCameraIfNeeded();
     }
};

// --- ЖИЗНЕННЫЙ ЦИКЛ ПРИЛОЖЕНИЯ ---
app.whenReady().then(() => {
    console.log("[App] Ready");
    initializeIpcHandlers(); // Инициализируем обработчики IPC
    createLauncherWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createLauncherWindow();
        }
    });
});

app.on('window-all-closed', () => {
    console.log("[App] All windows closed");
    // Не завершаем приложение, если лаунчер должен оставаться
     if (process.platform !== 'darwin' && !global.appState.launcherWindow) {
         console.log("[App] Quitting...");
         app.quit();
     } else if (!global.appState.launcherWindow) {
         console.log("[App] Quitting (non-darwin)...");
          app.quit(); // Quit on non-macOS if launcher is also closed
     }
     else {
         console.log("[App] Launcher window might still be open or platform is darwin.");
     }
});

app.on("before-quit", () => {
    console.log("[App] Before quit event");
    stopCanonCameraIfNeeded(); // Убедимся, что Canon остановлен
});

app.on("error", (error) => {
    console.error("[App] Uncaught App Error:", error);
});

process.on("uncaughtException", (error) => {
    console.error("[Process] Uncaught Exception:", error);
    // Возможно, здесь стоит показать диалог ошибки пользователю
     dialog.showErrorBox("Непредвиденная ошибка", `Произошла ошибка: ${error.message}\n\nПриложение может работать нестабильно.`);
});

process.on("unhandledRejection", (error) => {
    console.error("[Process] Unhandled Rejection:", error);
     dialog.showErrorBox("Необработанная ошибка Promise", `Произошла ошибка: ${error.message || error}`);

});


// --- ОБРАБОТЧИКИ КНОПОК ЛАУНЧЕРА (ЧЕРЕЗ IPC) ---
ipcMain.on(IpcChannels.OPEN_MAIN_WINDOW, (event, folderPath) => {
    console.log(`[IPC] Request to open Photobooth for: ${folderPath}`);
    if (global.appState.configuratorWindow) {
        global.appState.configuratorWindow.close(); // Закрываем конфигуратор, если открыт
    }
    createPhotoboothWindow(folderPath);
});

ipcMain.on(IpcChannels.OPEN_EMPTY_WINDOW, (event, folderPath) => {
     console.log(`[IPC] Request to open Configurator for: ${folderPath}`);
    if (global.appState.mainWindow) {
        global.appState.mainWindow.close(); // Закрываем фотобудку, если открыта
    }
    createConfiguratorWindow(folderPath);
});

ipcMain.on(IpcChannels.CLOSE_APP, () => {
    console.log("[IPC] Request to close app.");
    app.quit();
});

// Обработчик для переключения окон
ipcMain.on(IpcChannels.SWITCH_TO_PHOTOBOOTH, (event, folderPath) => {
     console.log(`[IPC] Request to switch to Photobooth for: ${folderPath}`);
     if (global.appState.configuratorWindow) {
        global.appState.configuratorWindow.close();
    }
    createPhotoboothWindow(folderPath); // Эта функция уже управляет существующим окном
});

ipcMain.on(IpcChannels.SWITCH_TO_CONFIGURATOR, (event, folderPath) => {
     console.log(`[IPC] Request to switch to Configurator for: ${folderPath}`);
     if (global.appState.mainWindow) {
        global.appState.mainWindow.close();
    }
     createConfiguratorWindow(folderPath); // Эта функция уже управляет существующим окном
});

// Обработчик для перезагрузки окон при выборе папки в лаунчере
 ipcMain.on(IpcChannels.RELOAD_OPEN_WINDOWS, (event, folderPath) => {
     console.log(`[IPC] Request to reload windows for folder: ${folderPath}`);
     // Устанавливаем новую папку (это обновит конфиг)
     setSelectedFolder(folderPath);
     // Закрываем существующие окна фотобудки/конфигуратора
     if (global.appState.mainWindow) {
         console.log('[IPC] Closing existing Photobooth window for reload.');
         global.appState.mainWindow.close(); // closed handler сделает null
     }
     if (global.appState.configuratorWindow) {
          console.log('[IPC] Closing existing Configurator window for reload.');
         global.appState.configuratorWindow.close(); // closed handler сделает null
     }
     // Новые окна будут созданы при нажатии кнопок в лаунчере
 });


// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (Оставшиеся) ---
// Загрузка стилей (может остаться здесь или перейти в отдельный сервис)
ipcMain.handle(IpcChannels.GET_STYLES, async (event, genders) => {
    const config = ConfigurationService.getCurrentConfig(); // Получаем актуальный конфиг

    if (!genders || genders.length === 0) {
        console.warn("[GetStyles] Genders not provided. Returning empty list.");
        return [];
    }
    let stylesDirectory = config.stylesDir;
    if (!stylesDirectory) {
        console.error("[GetStyles] stylesDir is not defined in config!");
        return [];
    }
    // Убедимся, что путь абсолютный (ConfigurationService должен был это сделать)
    if (!path.isAbsolute(stylesDirectory)) {
         console.warn(`[GetStyles] stylesDir is not absolute: ${stylesDirectory}. Resolving against basePath: ${config.basePath}`);
         stylesDirectory = path.resolve(config.basePath, stylesDirectory);
    }


    console.log(`[GetStyles] Loading styles for genders "${genders.join(", ")}" from directory: ${stylesDirectory}`);

    try {
        const styles = new Set(); // Используем Set для хранения уникальных стилей по имени

        if (!fs.existsSync(stylesDirectory)) {
            console.error(`[GetStyles] Styles directory does not exist: ${stylesDirectory}`);
             // Попытаться создать?
             try {
                 fs.mkdirSync(stylesDirectory, { recursive: true });
                 console.log(`[GetStyles] Created missing styles directory: ${stylesDirectory}`);
             } catch (mkdirErr) {
                  console.error(`[GetStyles] Failed to create styles directory:`, mkdirErr);
                 return []; // Выход, если не удалось создать
             }
            // return []; // Выход, если папки нет и не создали
        }

        for (const gender of genders) {
            const genderDir = path.join(stylesDirectory, gender);

            if (!fs.existsSync(genderDir)) {
                console.warn(`[GetStyles] Gender directory does not exist: ${genderDir}`);
                continue; // Пропускаем этот пол
            }

            const styleFolders = fs.readdirSync(genderDir, { encoding: "utf8", withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);


            for (const styleFolder of styleFolders) {
                const stylePath = path.join(genderDir, styleFolder);
                 try {
                    const files = fs.readdirSync(stylePath, { encoding: "utf8" });
                    // Ищем любое изображение для подтверждения стиля
                     const hasImages = files.some(file => /\.(jpg|jpeg|png)$/i.test(file));
                     if (hasImages) {
                         // Добавляем объект с оригинальным и отображаемым именем
                         // Отображаемое имя пока оставляем как имя папки
                         styles.add(JSON.stringify({ originalName: styleFolder, displayName: styleFolder }));
                     }
                 } catch (readStyleErr) {
                      console.error(`[GetStyles] Error reading style folder ${stylePath}:`, readStyleErr);
                 }

            }
        }

         // Преобразуем Set обратно в массив объектов
         const uniqueStyles = Array.from(styles).map(s => JSON.parse(s));

        if (uniqueStyles.length === 0) {
            console.warn(`[GetStyles] No styles found for specified genders in ${stylesDirectory}`);
        }

        return uniqueStyles;
    } catch (error) {
        console.error("[GetStyles] Error reading styles directory:", error);
        return [];
    }
});

// Мониторинг нагрузки (для отладки)
function monitorSystemLoad() {
    setInterval(async () => {
        try {
            // const cpuLoad = await si.currentLoad(); // systeminformation может быть тяжелым
            // console.log(`DEBUG: CPU Load: ${cpuLoad.currentLoad.toFixed(2)}%`);

             // GPU Load check might require specific drivers/tools installed
            // exec("nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits", (error, stdout, stderr) => {
            //     if (!error && stdout) {
            //         console.log(`DEBUG: GPU Load: ${stdout.trim()}%`);
            //     } else if (error && !error.message.includes('nvidia-smi') && !error.message.includes('not recognized')) {
            //          // Only log error if it's not just 'nvidia-smi not found'
            //          console.error("DEBUG: Error getting GPU load:", stderr || error.message);
            //     }
            // });
        } catch (error) {
            console.error("DEBUG: Error getting system load:", error);
        }
    }, 15000); // Проверять реже
}
// monitorSystemLoad(); // Включить для отладки

function debugAppState() {
    console.log('=== DEBUG APP STATE ===');
    console.log('global.selectedFolderPath:', global.selectedFolderPath);
     console.log('global.appState.selectedFolderPath:', global.appState.selectedFolderPath);
    console.log('Current Config Service basePath:', ConfigurationService.getCurrentConfig().basePath);
    console.log('Current Config Service stylesDir:', ConfigurationService.getCurrentConfig().stylesDir);
     console.log('Launcher Window:', global.appState.launcherWindow ? `ID: ${global.appState.launcherWindow.id}` : 'null');
     console.log('Photobooth Window:', global.appState.mainWindow ? `ID: ${global.appState.mainWindow.id}` : 'null');
     console.log('Configurator Window:', global.appState.configuratorWindow ? `ID: ${global.appState.configuratorWindow.id}` : 'null');
     console.log('Canon Running Flag:', global.appState.isCanonRunning);
    console.log('=======================');
}
```

**6. `src/windows/launcher/launcher.html` (Обновленный)**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Photobooth Launcher</title>
    <!-- Подключаем общие стили и стили лаунчера -->
    <link rel="stylesheet" href="../../renderer/assets/css/main.css">
    <!-- <link rel="stylesheet" href="launcher.css"> --> <!-- Или ссылка на бандл -->
    <link rel="stylesheet" href="../../renderer/assets/css/launcher.css"> <!-- Пример -->

</head>
<body>
    <div class="container">
        <h1>Фотобудка - Запуск</h1>

        <div class="controls">
            <button id="refreshFolders" title="Обновить список">🔄</button>
            <button id="createEvent" class="action-button">Создать мероприятие</button>
        </div>

        <div id="folderList" class="folder-list">
            <!-- Folder items will be loaded here -->
            <div class="loading-placeholder">Загрузка списка мероприятий...</div>
        </div>

         <!-- Template for folder items -->
        <template id="folder-item-template">
            <div class="folder-item">
                <div class="folder-info">
                    <span class="folder-name">Event Name</span>
                    <span class="folder-date">Date</span>
                </div>
                <div class="folder-actions">
                    <button class="edit-event-button icon-button" title="Настройки">⚙️</button>
                    <button class="delete-event-button icon-button" title="Удалить">🗑️</button>
                </div>
            </div>
        </template>

        <div class="actions">
            <button id="openMainWindow" class="action-button" disabled>Запустить Фотобудку</button>
            <button id="openEmptyWindow" class="action-button" disabled>Открыть Конфигуратор</button>
            <button id="closeApp" class="action-button secondary">Закрыть</button>
        </div>
    </div>

     <!-- Create Event Modal -->
    <div id="createEventModal" class="modal">
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2>Создать новое мероприятие</h2>
            <div class="form-group">
                <label for="eventDate">Дата (ДД.ММ.ГГГГ):</label>
                <div class="date-input-group">
                     <input type="text" id="eventDate" placeholder="Выберите дату">
                     <button id="calendarToggle" class="icon-button">📅</button>
                 </div>
                <span id="eventDateError" class="error-text"></span>
            </div>
            <div class="form-group">
                <label for="eventName">Название:</label>
                <input type="text" id="eventName" placeholder="Название мероприятия">
                <span id="eventNameError" class="error-text"></span>
            </div>
            <div class="modal-actions">
                <button id="createEventButton" class="action-button">Создать</button>
                <button id="cancelEventButton" class="action-button secondary">Отмена</button>
            </div>
        </div>
    </div>

     <!-- Delete Confirmation Modal -->
    <div id="deleteConfirmModal" class="modal">
        <div class="modal-content">
             <span class="close-modal">&times;</span> <!-- Добавил крестик -->
            <h2>Подтверждение удаления</h2>
            <p>Вы уверены, что хотите удалить мероприятие <strong id="eventToDelete"></strong>? Это действие необратимо.</p>
            <div class="modal-actions">
                <button id="confirmDeleteButton" class="action-button danger">Удалить</button>
                <button id="cancelDeleteButton" class="action-button secondary">Отмена</button>
            </div>
        </div>
    </div>

     <!-- Config Editor Modal (Basic JSON editor) -->
     <div id="configEditorModal" class="modal large">
        <div class="modal-content">
            <span class="close-modal" id="closeConfigEditor">&times;</span>
            <h2>Редактор конфигурации: <span id="configEventName"></span></h2>
             <div id="configEditorBody" class="config-editor-body">
                <!-- Config fields will be rendered here -->
            </div>
            <div class="modal-actions">
                <button id="saveConfigButton" class="action-button">Сохранить</button>
                <button id="cancelConfigButton" class="action-button secondary">Отмена</button>
            </div>
        </div>
    </div>


    <!-- Подключаем скрипты -->
     <script src="../../renderer/utils/datepicker.js"></script> <!-- Подключаем DatePicker -->
    <script src="launcher.js"></script>
</body>
</html>
```

**7. `src/windows/launcher/launcher.js` (Обновлены пути и IPC)**
```javascript
// src/windows/launcher/launcher.js
const { ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");
// const { config } = require("process"); // process.config не используется

// --- ИМПОРТЫ ИЗ НОВОЙ СТРУКТУРЫ ---
// Загрузчик конфига больше не нужен здесь напрямую, будем получать через IPC,
// но пока оставим для FOLDER_PATH, хотя лучше получать его из main
// const ConfigurationService = require('../../main/services/ConfigurationService'); // Неправильно, renderer не может require из main
const IpcChannels = require("../../shared/constants/IpcChannels");
// Загрузим NotificationService позже, пока оставим showNotification
// const NotificationService = require('../../renderer/components/Notification/NotificationService');
// --- КОНЕЦ ИМПОРТОВ ---


// Load initial config - получаем из main process
let initialConfig = {}; // Будет получено через IPC
let FOLDER_PATH = "C:\\temp"; // Временное значение, будет перезаписано

ipcRenderer.invoke(IpcChannels.GET_CURRENT_CONFIG).then(config => {
    initialConfig = config;
    // Используем basePath из глобального конфига, если он есть
    FOLDER_PATH = initialConfig.basePath || "C:\\temp"; // Путь к папке, где лежит UserFolder
    console.log("Launcher received initial config, FOLDER_PATH set to:", FOLDER_PATH);
    getFolders(); // Начинаем загрузку папок после получения пути
}).catch(err => {
    console.error("Failed to get initial config:", err);
    getFolders(); // Пытаемся загрузить папки с путем по умолчанию
});


// Folder path to scan - use configured path or fallback
// const FOLDER_PATH = initialConfig.basePath || "C:\\temp"; // Устанавливается выше

// ... (formatDate, validateFolderStructure остаются без изменений) ...
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
function validateFolderStructure(basePath) {
  try {
    if (!fs.existsSync(basePath)) {
      return { valid: false, message: `Директория ${basePath} не существует` };
    }
    const items = fs.readdirSync(basePath);

     // Проверяем наличие UserFolder
     const userFolderPath = path.join(basePath, "UserFolder");
     const hasUserFolder = fs.existsSync(userFolderPath) && fs.statSync(userFolderPath).isDirectory();
     if (!hasUserFolder) {
         return { valid: false, message: `Отсутствует папка 'UserFolder' в ${basePath}` };
     }

     // Проверяем наличие Events внутри UserFolder
    const eventsPath = path.join(userFolderPath, "Events")
    const hasEventsFolder = fs.existsSync(eventsPath) && fs.statSync(eventsPath).isDirectory()
     if (!hasEventsFolder) {
          return { valid: false, message: `Отсутствует папка 'Events' внутри 'UserFolder'` };
     }

     // Проверка на .exe и .json теперь не так важна для лаунчера, важнее UserFolder/Events
    // const hasExeFile = items.some((item) => item.endsWith(".exe") && fs.statSync(path.join(basePath, item)).isFile());
    // const hasJsonFile = items.some((item) => item.endsWith(".json") && fs.statSync(path.join(basePath, item)).isFile());
    // const missingItems = [];
    // if (!hasExeFile) missingItems.push("*.exe файл");
    // if (!hasJsonFile) missingItems.push("*.json файл");
    // if (missingItems.length > 0) {
    //   return { valid: false, message: `Некорректная структура папки ${basePath}. Отсутствуют: ${missingItems.join(", ")}` };
    // }

    return { valid: true, eventsPath: eventsPath };
  } catch (error) {
    console.error("Ошибка при проверке структуры папки:", error);
    return { valid: false, message: `Ошибка при проверке структуры папки: ${error.message}` };
  }
}


// Add global variable to track if a folder is selected
let selectedFolderPath = null;
let eventsBasePath = null; // Путь к C:\...\UserFolder\Events

// Get folders from the specified path
async function getFolders() {
  const folderListElement = document.getElementById("folderList");
  const refreshButton = document.getElementById("refreshFolders");
  const createEventButton = document.getElementById("createEvent");

  if (!folderListElement || !refreshButton || !createEventButton) {
      console.error("Core UI elements not found in launcher.");
      return;
  }

  refreshButton.classList.add("spinning");
  folderListElement.innerHTML = '<div class="loading-placeholder">Обновление...</div>'; // Показываем загрузку

  selectedFolderPath = null;
  updateButtonState();

  try {
    // Validate folder structure using FOLDER_PATH (путь к корневой папке приложения)
    const validation = validateFolderStructure(FOLDER_PATH);

    if (!validation.valid) {
      folderListElement.innerHTML = `<div class="error-message">${validation.message}</div>`;
      createEventButton.disabled = true;
      createEventButton.classList.add("disabled");
      return;
    }

    createEventButton.disabled = false;
    createEventButton.classList.remove("disabled");

    // Use the Events folder path
    eventsBasePath = validation.eventsPath; // Путь к UserFolder/Events

    const items = fs.readdirSync(eventsBasePath, { withFileTypes: true });

    const folders = items
      .filter(item => item.isDirectory() && item.name !== "default") // Исключаем 'default'
      .map(item => {
        try {
          const folderPath = path.join(eventsBasePath, item.name);
          const stats = fs.statSync(folderPath);
          return {
            name: item.name,
            createdAt: stats.birthtime || stats.mtime, // Use mtime as fallback
            path: folderPath,
          };
        } catch (err) {
          console.error(`Error getting stats for ${item.name}:`, err);
          return null;
        }
      })
      .filter(folder => folder !== null)
      .sort((a, b) => b.createdAt - a.createdAt); // Newest first

    if (folders.length === 0) {
      folderListElement.innerHTML = `<div class="empty-message">Папка Events пуста. Создайте папку мероприятия.</div>`;
    } else {
      folderListElement.innerHTML = ''; // Clear loading/error message
      const template = document.getElementById('folder-item-template');
      const fragment = document.createDocumentFragment();

      folders.forEach(folder => {
        const nameParts = folder.name.split('_');
        const dateStr = nameParts[0] || '';
        const eventName = nameParts.slice(1).join('_') || folder.name;

        const folderItemClone = template.content.cloneNode(true);
        const folderItemElement = folderItemClone.querySelector('.folder-item');

        folderItemElement.setAttribute('data-path', folder.path);
        folderItemElement.setAttribute('data-name', folder.name);
        folderItemElement.querySelector('.folder-name').textContent = eventName;
        folderItemElement.querySelector('.folder-date').textContent = dateStr;

         // Add click listener to the item itself (excluding buttons)
         folderItemElement.addEventListener("click", (event) => {
             if (event.target.closest('.delete-event-button') || event.target.closest('.edit-event-button')) {
                 return; // Ignore clicks on buttons
             }
             handleFolderSelection(folderItemElement);
         });


         // Add listeners to buttons within the item
         const deleteButton = folderItemElement.querySelector(".delete-event-button");
         const editButton = folderItemElement.querySelector(".edit-event-button");

          if (deleteButton) {
             deleteButton.addEventListener("click", (event) => {
                 event.stopPropagation(); // Prevent folder selection
                 const pathToDelete = folderItemElement.getAttribute("data-path");
                 const nameToDelete = folderItemElement.getAttribute("data-name");
                 showDeleteConfirmation(pathToDelete, nameToDelete);
             });
          }

          if (editButton) {
             editButton.addEventListener("click", (event) => {
                 event.stopPropagation(); // Prevent folder selection
                 const pathToEdit = folderItemElement.getAttribute("data-path");
                 const nameToEdit = folderItemElement.getAttribute("data-name");
                 openConfigEditor(pathToEdit, nameToEdit);
             });
         }

        fragment.appendChild(folderItemClone);
      });

      folderListElement.appendChild(fragment);
    }
  } catch (error) {
    console.error("Error reading folders:", error);
    folderListElement.innerHTML = `<div class="error-message">Ошибка чтения папок: ${error.message}</div>`;
     createEventButton.disabled = true; // Disable create on error
     createEventButton.classList.add("disabled");
  } finally {
    setTimeout(() => {
      refreshButton.classList.remove("spinning");
    }, 300); // Shorter timeout
  }
}

// Helper function for folder selection logic
function handleFolderSelection(itemElement) {
    const folderPath = itemElement.getAttribute("data-path");
    console.log("Selected event folder:", folderPath);

    // Store the selected folder path
    selectedFolderPath = folderPath;

    // Send the selected folder to main process - Use Constant
    ipcRenderer.send(IpcChannels.SELECTED_FOLDER, folderPath);

    // Highlight selected folder
    document.querySelectorAll(".folder-item").forEach(f => f.classList.remove("selected"));
    itemElement.classList.add("selected");

    // Enable the buttons after selection
    updateButtonState();
}


// ... (updateButtonState остается) ...
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

// ... (createEventFolder, copyFolderContents остаются) ...
function createEventFolder(eventDate, eventName) {
  if (!eventsBasePath) {
    showNotification('Ошибка: путь к папке мероприятий не найден.', 'error');
    return false;
  }

  try {
    const folderName = `${eventDate}_${eventName}`;
    const eventFolderPath = path.join(eventsBasePath, folderName);

    if (fs.existsSync(eventFolderPath)) {
      showNotification('Папка с таким именем уже существует!', 'error');
      return false;
    }

    fs.mkdirSync(eventFolderPath, { recursive: true });

    const defaultFolderPath = path.join(eventsBasePath, 'default');
    if (fs.existsSync(defaultFolderPath)) {
      copyFolderContents(defaultFolderPath, eventFolderPath);
    } else {
        // Создаем пустой config.json, если папки default нет
         const defaultConfigContent = JSON.stringify({
            // Здесь можно добавить базовые настройки по умолчанию
            authToken: "YOUR_INITIAL_TOKEN",
            mode: "style_sdxl",
            prePhotoTimer: 4,
            // ... другие минимальные настройки
        }, null, 2);
         fs.writeFileSync(path.join(eventFolderPath, 'config.json'), defaultConfigContent, 'utf8');
          console.log("Created default config.json in new event folder.");
    }

    showNotification(`Мероприятие "${folderName}" успешно создано!`, 'success');
    getFolders(); // Refresh folder list
    return true;
  } catch (error) {
    console.error('Ошибка при создании мероприятия:', error);
    showNotification(`Ошибка при создании мероприятия: ${error.message}`, 'error');
    return false;
  }
}
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
      fs.mkdirSync(targetPath, { recursive: true });
      copyFolderContents(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}

// ... (showNotification - пока оставляем здесь, но потом вынесем) ...
function showNotification(message, type = 'info') {
  // TODO: Replace with NotificationService.show(message, type)
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  // Simple icon logic
  let icon = '';
  if (type === 'success') icon = '✓';
  else if (type === 'error') icon = '✕';
  else icon = 'ℹ';
  notification.innerHTML = `<span class="notification-icon">${icon}</span> ${message}`;

  document.body.appendChild(notification);
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (document.body.contains(notification)) { // Check if still exists
          document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// ... (isValidDate, initDatePicker, showEventModal, showDeleteConfirmation, deleteEventFolder, deleteFolderRecursive остаются) ...
function isValidDate(dateStr) {
  const regex = /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.(\d{4})$/; // Updated regex
  if (!regex.test(dateStr)) {
    return false;
  }
  const parts = dateStr.match(regex);
  const day = parseInt(parts[1], 10);
  const month = parseInt(parts[2], 10) - 1; // JS months are 0-based
  const year = parseInt(parts[3], 10);
  const date = new Date(year, month, day);
  return date.getDate() === day && date.getMonth() === month && date.getFullYear() === year;
}
function initDatePicker() {
  const dateInput = document.getElementById('eventDate');
  const calendarToggle = document.getElementById('calendarToggle');
  if (!dateInput || !calendarToggle) return;

   if (typeof SimpleDatePicker === 'undefined') {
        console.error("SimpleDatePicker is not loaded!");
        calendarToggle.style.display = 'none'; // Hide toggle if picker unavailable
        return;
    }

  const datePicker = new SimpleDatePicker(dateInput, {
    onSelect: function(date, dateStr) {
      dateInput.value = dateStr;
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
  calendarToggle.addEventListener('click', function() {
    datePicker.toggle();
  });
  dateInput.addEventListener('input', function() {
    const dateError = document.getElementById('eventDateError');
    if (dateError) {
      dateError.textContent = '';
    }
  });
  window.currentDatePicker = datePicker; // Prevent garbage collection if needed
}
function showEventModal() {
  const modal = document.getElementById('createEventModal');
  if (!modal) return;
  document.getElementById('eventDate').value = '';
  document.getElementById('eventName').value = '';
  document.getElementById('eventDateError').textContent = '';
  document.getElementById('eventNameError').textContent = '';
  modal.style.display = 'flex';

  if (!window.eventModalInitialized) {
    const closeButton = modal.querySelector('.close-modal');
    if(closeButton) closeButton.addEventListener('click', () => { modal.style.display = 'none'; });

    const createEventButton = document.getElementById('createEventButton');
     if(createEventButton) createEventButton.addEventListener('click', () => {
      const dateInput = document.getElementById('eventDate');
      const nameInput = document.getElementById('eventName');
      const dateError = document.getElementById('eventDateError');
      const nameError = document.getElementById('eventNameError');
      const eventDate = dateInput.value.trim();
      const eventName = nameInput.value.trim();
      dateError.textContent = '';
      nameError.textContent = '';
      let isValidForm = true; // Renamed from isValid
      if (!eventDate) {
        dateError.textContent = 'Введите дату мероприятия';
        isValidForm = false;
      } else if (!isValidDate(eventDate)) {
        dateError.textContent = 'Неверный формат даты. Используйте ДД.ММ.ГГГГ';
        isValidForm = false;
      }
      if (!eventName) {
        nameError.textContent = 'Введите название мероприятия';
        isValidForm = false;
      } else if (/[\\/:*?"<>|]/.test(eventName)) { // Simplified regex
        nameError.textContent = 'Название содержит недопустимые символы';
        isValidForm = false;
      }
      if (isValidForm) {
        const success = createEventFolder(eventDate, eventName);
        if (success) {
          modal.style.display = 'none';
        }
      }
    });

    const cancelEventButton = document.getElementById('cancelEventButton');
    if(cancelEventButton) cancelEventButton.addEventListener('click', () => { modal.style.display = 'none'; });

    initDatePicker();
    window.eventModalInitialized = true;
  }
}
function showDeleteConfirmation(folderPath, folderName) {
    const confirmModal = document.getElementById('deleteConfirmModal');
    if (!confirmModal) return;
    const eventToDeleteSpan = document.getElementById('eventToDelete');
    if(eventToDeleteSpan) eventToDeleteSpan.textContent = folderName;

    confirmModal.style.display = 'flex';
    confirmModal.setAttribute('data-path', folderPath);
    confirmModal.setAttribute('data-name', folderName);

    // Ensure listeners are attached only once
    if (!window.deleteModalInitialized) {
        const confirmButton = document.getElementById('confirmDeleteButton');
        if (confirmButton) {
            confirmButton.addEventListener('click', () => {
                const pathToDelete = confirmModal.getAttribute('data-path');
                const nameToDelete = confirmModal.getAttribute('data-name');
                if (pathToDelete && nameToDelete) {
                    deleteEventFolder(pathToDelete, nameToDelete);
                }
                confirmModal.style.display = 'none';
            });
        }

        const cancelButton = document.getElementById('cancelDeleteButton');
         if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                confirmModal.style.display = 'none';
            });
        }
        const closeButton = confirmModal.querySelector('.close-modal');
         if (closeButton) {
             closeButton.addEventListener('click', () => {
                 confirmModal.style.display = 'none';
             });
         }

        window.deleteModalInitialized = true;
    }
}
function deleteEventFolder(folderPath, folderName) {
  try {
    if (!fs.existsSync(folderPath)) {
      showNotification('Папка мероприятия не найдена.', 'error');
      return;
    }
    if (selectedFolderPath === folderPath) {
      selectedFolderPath = null;
      updateButtonState();
      ipcRenderer.send(IpcChannels.SELECTED_FOLDER, null); // Use constant
    }
    deleteFolderRecursive(folderPath);
    showNotification(`Мероприятие "${folderName}" успешно удалено!`, 'success');
    getFolders(); // Refresh list
  } catch (error) {
    console.error('Ошибка при удалении мероприятия:', error);
    showNotification(`Ошибка при удалении мероприятия: ${error.message}`, 'error');
  }
}
function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(folderPath);
  }
}


// ... (openConfigEditor, renderConfigEditor, saveConfig остаются, но saveConfig должен будет использовать IPC) ...
function openConfigEditor(folderPath, folderName) {
  const configEditorModal = document.getElementById('configEditorModal');
  const configEditorBody = document.getElementById('configEditorBody');
  const configEventNameSpan = document.getElementById('configEventName');

  if (!configEditorModal || !configEditorBody || !configEventNameSpan) return;

  configEventNameSpan.textContent = folderName;
  configEditorBody.innerHTML = '<div class="loading">Загрузка конфигурации...</div>';
  configEditorModal.setAttribute('data-path', folderPath);
  configEditorModal.style.display = 'flex';

  try {
    const configPath = path.join(folderPath, 'config.json');
    if (!fs.existsSync(configPath)) {
      configEditorBody.innerHTML = `<div class="config-error">Файл конфигурации не найден.</div>`;
      // Скрыть кнопку сохранения, если файла нет?
      document.getElementById('saveConfigButton').style.display = 'none';
      return;
    }
     document.getElementById('saveConfigButton').style.display = 'inline-block'; // Показать кнопку

    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    renderConfigEditor(configData, configEditorBody);

  } catch (error) {
    console.error('Ошибка при загрузке конфигурации для редактора:', error);
    configEditorBody.innerHTML = `<div class="config-error">Ошибка загрузки: ${error.message}</div>`;
     document.getElementById('saveConfigButton').style.display = 'none';
  }

  // Setup listeners only once
  if (!window.configEditorInitialized) {
    const closeButton = document.getElementById('closeConfigEditor');
    if(closeButton) closeButton.addEventListener('click', () => { configEditorModal.style.display = 'none'; });

    const saveButton = document.getElementById('saveConfigButton');
     if(saveButton) saveButton.addEventListener('click', () => { saveConfig(configEditorModal); });

    const cancelButton = document.getElementById('cancelConfigButton');
     if(cancelButton) cancelButton.addEventListener('click', () => { configEditorModal.style.display = 'none'; });

    window.configEditorInitialized = true;
  }
}
function renderConfigEditor(configData, container) {
  container.innerHTML = ''; // Clear previous content
  container.setAttribute('data-original-config', JSON.stringify(configData));

  Object.entries(configData).forEach(([key, value]) => {
    const propertyType = typeof value;
    const propertyContainer = document.createElement('div');
    propertyContainer.className = 'config-property';

    const label = document.createElement('label');
    label.textContent = key;
    label.htmlFor = `config-${key}`;
    propertyContainer.appendChild(label);

    let input;
    if (key === 'basePath' || key === 'stylesDir') { // Don't allow editing basePath/stylesDir here
        input = document.createElement('input');
        input.type = 'text';
        input.value = value;
        input.readOnly = true;
        input.classList.add('readonly-input');
    } else if (propertyType === 'boolean') {
      input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = value;
      input.id = `config-${key}`;
    } else if (propertyType === 'number') {
      input = document.createElement('input');
      input.type = 'number';
      input.value = value;
      input.id = `config-${key}`;
    } else if (propertyType === 'string') {
         if (key === 'animatedBackground' || key.toLowerCase().includes('color')) { // Simple heuristic for color/gradient
             // Could add a color picker here later
             input = document.createElement('input');
             input.type = 'text'; // Keep as text for now, maybe add color picker later
             input.value = value;
         } else if (key.toLowerCase().includes('path') || key.toLowerCase().includes('image')) {
              input = document.createElement('input'); // TODO: Could integrate FilePickerComponent here later
              input.type = 'text';
              input.value = value;
         }
         else {
             input = document.createElement('input');
             input.type = 'text';
             input.value = value;
         }
        input.id = `config-${key}`;

    } else if (propertyType === 'object' && value !== null) {
      input = document.createElement('textarea');
      try {
          input.value = JSON.stringify(value, null, 2);
      } catch {
          input.value = "[[Invalid JSON]]";
      }
      input.style.minHeight = '80px'; // Adjust size
      input.id = `config-${key}`;
    } else {
      // Fallback for null or other types
      input = document.createElement('input');
      input.type = 'text';
      input.value = String(value);
      input.id = `config-${key}`;
      input.readOnly = true; // Make non-editable by default
       input.classList.add('readonly-input');
    }

     if (input) { // Ensure input was created
        input.setAttribute('data-key', key);
        input.setAttribute('data-type', propertyType);
        propertyContainer.appendChild(input);
     }

    container.appendChild(propertyContainer);
  });
}
// TODO: Update saveConfig to use IPC
async function saveConfig(modal) {
  const folderPath = modal.getAttribute('data-path');
  const configEditorBody = document.getElementById('configEditorBody');
   if (!folderPath || !configEditorBody) return;

  try {
    const originalConfig = JSON.parse(configEditorBody.getAttribute('data-original-config') || '{}');
    const updatedConfigData = {};

    configEditorBody.querySelectorAll('input[data-key], textarea[data-key]').forEach(input => {
      const key = input.getAttribute('data-key');
       if (!key || input.readOnly || key === 'basePath' || key === 'stylesDir') return; // Skip readonly/protected fields

      const type = input.getAttribute('data-type');
      let value;

      if (type === 'boolean') {
        value = input.checked;
      } else if (type === 'number') {
        value = Number(input.value);
         if (isNaN(value)) value = originalConfig[key]; // Fallback to original if invalid number
      } else if (type === 'object') {
        try {
          value = JSON.parse(input.value);
        } catch (e) {
          console.error(`Ошибка при разборе JSON для поля ${key}:`, e);
          showNotification(`Некорректный JSON для поля ${key}`, 'error');
           value = originalConfig[key]; // Keep original on error
           input.value = JSON.stringify(value, null, 2); // Reset textarea to valid JSON
        }
      } else { // string
        value = input.value;
      }
      updatedConfigData[key] = value;
    });

    // --- ИСПОЛЬЗОВАНИЕ IPC ДЛЯ СОХРАНЕНИЯ ---
    const success = await ipcRenderer.invoke(IpcChannels.SAVE_EVENT_CONFIG, folderPath, updatedConfigData);

    if (success) {
        showNotification(`Конфигурация успешно сохранена`, 'success');
        modal.style.display = 'none';
        // Опционально: обновить data-original-config, если модалка не закрывается
        configEditorBody.setAttribute('data-original-config', JSON.stringify({ ...originalConfig, ...updatedConfigData }));
        // Уведомить main об обновлении (если нужно немедленно отразить где-то еще)
        ipcRenderer.send(IpcChannels.CONFIG_UPDATED, folderPath);
    } else {
         showNotification(`Ошибка при сохранении конфигурации`, 'error');
    }
    // --- КОНЕЦ ИСПОЛЬЗОВАНИЯ IPC ---

  } catch (error) {
    console.error('Ошибка при сохранении конфигурации:', error);
    showNotification(`Ошибка: ${error.message}`, 'error');
  }
}


// Set up button event listeners
document.addEventListener("DOMContentLoaded", () => {
  // getFolders(); // Load folders after config/path is ready
  updateButtonState(); // Initialize buttons as disabled

  const refreshButton = document.getElementById("refreshFolders");
  if(refreshButton) refreshButton.addEventListener("click", getFolders);

  const createEventButton = document.getElementById("createEvent");
  if (createEventButton) {
    createEventButton.addEventListener("click", showEventModal);
  }

  const openMainButton = document.getElementById("openMainWindow");
  if(openMainButton) openMainButton.addEventListener("click", () => {
    if (selectedFolderPath) {
      console.log("Opening main window with folder:", selectedFolderPath);
      // Use Constant
      ipcRenderer.send(IpcChannels.OPEN_MAIN_WINDOW, selectedFolderPath);
    }
  });

  const openEmptyButton = document.getElementById("openEmptyWindow");
   if(openEmptyButton) openEmptyButton.addEventListener("click", () => {
    if (selectedFolderPath) {
      console.log("Opening configurator window with folder:", selectedFolderPath);
      // Use Constant
      ipcRenderer.send(IpcChannels.OPEN_EMPTY_WINDOW, selectedFolderPath);
    }
  });

  const closeAppButton = document.getElementById("closeApp");
   if(closeAppButton) closeAppButton.addEventListener("click", () => {
       // Use Constant
    ipcRenderer.send(IpcChannels.CLOSE_APP);
  });

   // Listen for config updates from main process
   ipcRenderer.on(IpcChannels.CONFIG_UPDATE, (event, newConfig) => {
       console.log("Launcher received config update from main:", newConfig);
       initialConfig = newConfig;
       FOLDER_PATH = initialConfig.basePath || "C:\\temp";
       // Optionally re-validate structure or update UI if needed
   });
});
```

**8. HTML и JS для Configurator и Photobooth:**
*   Аналогично `launcher.html`/`launcher.js`, нужно будет создать `configurator.html`, `photobooth.html` и обновить в них пути к CSS/JS.
*   В `configurator.js` и `photobooth.js` обновить все `require` и использовать константы `IpcChannels`.

**9. `src/renderer/utils/saveUtils.js` (Обновлен путь к config)**
```javascript
// src/renderer/utils/saveUtils.js
const fs = require("fs");
const path = require("path");
const sharp = require("sharp"); // sharp нужен здесь

// --- Используем IPC для получения конфига ---
const { ipcRenderer } = require("electron");
const IpcChannels = require('../../shared/constants/IpcChannels');

let config = null;
let baseDir = null; // Будет установлено после получения конфига

// Функция для асинхронного получения конфига
async function getConfigAsync() {
    if (!config) { // Загружаем только если еще не загружен
        try {
            console.log("[SaveUtils] Requesting current config...");
            config = await ipcRenderer.invoke(IpcChannels.GET_CURRENT_CONFIG);
            if (!config || !config.basePath) {
                 console.error("[SaveUtils] Invalid config received from main process:", config);
                 // Установить пути по умолчанию в крайнем случае
                 config = config || {};
                 config.basePath = config.basePath || 'C:\\temp'; // Безопасное значение по умолчанию
            }
            // Используем basePath из актуального конфига
             baseDir = path.join(config.basePath, "SavedPhotos");
            console.log("[SaveUtils] Config received, baseDir set to:", baseDir);
             if (!fs.existsSync(baseDir)) {
                 console.warn(`[SaveUtils] Base directory ${baseDir} does not exist. Creating...`);
                 fs.mkdirSync(baseDir, { recursive: true });
             }
        } catch (err) {
            console.error("[SaveUtils] Error getting config via IPC:", err);
            // Установить пути по умолчанию в крайнем случае
             config = { basePath: 'C:\\temp', hotFolder: { enabled: false, path: '' } };
             baseDir = path.join(config.basePath, "SavedPhotos");
             if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
        }
    }
     // Всегда возвращаем текущий config (может быть обновлен извне)
    return config;
}

// --- КОНЕЦ ИЗМЕНЕНИЙ ДЛЯ КОНФИГА ---

function createDateFolders() {
  if (!baseDir) {
      console.error("[SaveUtils] baseDir not set. Cannot create date folders.");
      throw new Error("Base directory for photos is not configured.");
  }
  try {
    const dateFolder = path.join(baseDir, new Date().toISOString().slice(0, 10).replace(/-/g, "_"));
    const inputDir = path.join(dateFolder, "input");
    const outputDir = path.join(dateFolder, "output");
    // Ensure baseDir exists first
     if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    [dateFolder, inputDir, outputDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    return { inputDir, outputDir };
  } catch (error) {
    console.error("Error in createDateFolders:", error);
    throw error;
  }
}

function generateFileName() {
  try {
    const date = new Date();
    const timeString = `${date.getHours().toString().padStart(2,'0')}_${date.getMinutes().toString().padStart(2,'0')}_${date.getSeconds().toString().padStart(2,'0')}`; // Добавил паддинг
    const randomString = Math.random().toString(36).substring(2, 6);
    return `${timeString}_${randomString}.jpg`; // Всегда jpg после sharp
  } catch (error) {
    console.error("Error in generateFileName:", error);
    throw error; // Пробрасываем ошибку
  }
}

// saveImageWithUtils теперь асинхронна из-за getConfigAsync
async function saveImageWithUtils(folderType, urlImage) {
  try {
    const currentConfig = await getConfigAsync(); // Получаем актуальный конфиг
     if (!baseDir) { // Еще одна проверка после получения конфига
         throw new Error("Base directory for photos is not configured after fetching config.");
     }

    const { inputDir, outputDir } = createDateFolders(); // Папки создаются на основе baseDir
    const folderPath = folderType === "input" ? inputDir : outputDir;
    const fileName = generateFileName();
    const filePath = path.join(folderPath, fileName);
    let fileBuffer;

    let sourceBuffer;
     if (folderType === "input" || !/^https?:\/\//.test(urlImage)) {
       const imageData = urlImage.replace(/^data:image\/\w+;base64,/, "");
       sourceBuffer = Buffer.from(imageData, "base64");
     } else {
       const response = await fetch(urlImage);
       if (!response.ok) {
         throw new Error(`Не удалось загрузить изображение: ${response.statusText}`);
       }
       const arrayBuffer = await response.arrayBuffer();
       sourceBuffer = Buffer.from(arrayBuffer);
     }

     // Обработка через sharp (качество и размер)
     fileBuffer = await sharp(sourceBuffer)
        // .resize({ width: 1280, height: 720, fit: "inside" }) // Опционально: изменить размер?
        .toFormat("jpeg", { quality: 90 }) // Устанавливаем качество JPEG
        .toBuffer();


    // Если требуется копирование в HotFolder (только для output?)
    // Решаем, когда копировать - input или output? Обычно output.
    if (folderType === "output" && currentConfig?.hotFolder?.enabled) {
      let hotPath = currentConfig.hotFolder.path;
      if (!hotPath) {
          console.warn("[SaveUtils] Hot folder path is not configured, skipping copy.");
      } else {
          if (!fs.existsSync(hotPath)) {
            try {
              fs.mkdirSync(hotPath, { recursive: true });
              console.log("[SaveUtils] Папка HotFolder создана:", hotPath);
            } catch(mkdirErr) {
                 console.error(`[SaveUtils] Не удалось создать HotFolder ${hotPath}:`, mkdirErr);
                 hotPath = null; // Не копировать, если не удалось создать
            }
          }

          if (hotPath) {
              const hotFilePath = path.join(hotPath, fileName);
              fs.writeFileSync(hotFilePath, fileBuffer); // Сохраняем обработанный буфер
              console.log(`[SaveUtils] Изображение скопировано в HotFolder: ${hotFilePath}`);
          }
      }
    }

    // Сохраняем изображение в input/output папку
    fs.writeFileSync(filePath, fileBuffer); // Сохраняем обработанный буфер
    console.log(`[SaveUtils] Изображение сохранено (${folderType}):`, filePath);

  } catch (error) {
    console.error(`[SaveUtils] Ошибка в saveImage (${folderType}):`, error);
    // Не пробрасываем ошибку дальше, чтобы не ломать основной поток?
    // Или пробрасывать и обрабатывать выше? Зависит от требований.
  }
}

// copyPhotoToDateFolder тоже асинхронна
async function copyPhotoToDateFolder(imagesFolder, sourceFilePath) {
  try {
     await getConfigAsync(); // Убедимся, что baseDir установлен
     if (!baseDir) {
         throw new Error("Base directory for photos is not configured.");
     }

    const filename = path.basename(sourceFilePath); // Получаем только имя файла
    const { inputDir } = createDateFolders(); // Получаем путь к папке input

    // Проверяем существование исходного файла
    if (!fs.existsSync(sourceFilePath)) {
      console.error(`[SaveUtils] Исходный файл для копирования не найден: ${sourceFilePath}`);
      return null;
    }

    const newFileName = generateFileName(); // Генерируем новое имя
    const targetPath = path.join(inputDir, newFileName);

    await fs.promises.copyFile(sourceFilePath, targetPath);
    console.log(`[SaveUtils] Оригинал фото скопирован в input: ${targetPath}`);

    return targetPath;
  } catch (error) {
    console.error(`[SaveUtils] Ошибка копирования оригинального фото: ${error.message}`);
    return null;
  }
}

// Экспортируем только нужные функции
module.exports = { saveImageWithUtils, copyPhotoToDateFolder };
```

**Что сделано на этом этапе:**

1.  **Создана Структура:** Определены новые папки `src`, `main`, `renderer`, `shared`, `windows`.
2.  **Перемещены Файлы:** Ключевые JS-файлы (`main.js`, `script.js`, `empty.js`, `launcher.js`, `configLoader.js`, `saveUtils.js`, `datepicker.js`) и `translations.json` помещены в новые директории.
3.  **Обновлены Основные Пути:**
    *   `package.json` указывает на `src/main/main.js`.
    *   `main.js` загружает HTML из `src/windows/*/*.html`.
    *   HTML-файлы обновлены для корректного подключения своих JS и CSS (предполагаются пути типа `../../renderer/assets/css/main.css` и `./launcher.js`).
    *   Обновлены `require` пути внутри перемещенных JS-файлов для импорта других перемещенных модулей (например, `saveUtils` или `datepicker`).
4.  **Созданы Константы IPC:** Файл `src/shared/constants/IpcChannels.js` создан, и некоторые ключевые вызовы IPC в `launcher.js` и `main.js` обновлены для их использования.
5.  **Начальная Реализация Сервисов:**
    *   `ConfigurationService` создан на основе `configLoader.js`, логика загрузки/объединения/интерполяции перенесена туда. Добавлено базовое сохранение.
    *   `IpcMainHandlers` создан для будущей централизации обработчиков `main`. Перенесены некоторые обработчики (печать, получение принтеров и т.д.).
    *   `IpcRendererService` создан как заглушка для будущих оберток.
6.  **Адаптация `saveUtils`:** Модуль обновлен для получения конфигурации через IPC (`getConfigAsync`), а не через прямой `require`.

**Что дальше:**

*   **Запуск и Отладка Путей:** Первый запуск после этих изменений, скорее всего, выявит ошибки в путях `require` или ссылках в HTML. Их нужно будет исправить.
*   **Полноценная Реализация Сервисов:** Начать переносить логику из `main.js` и renderer-скриптов в соответствующие сервисы (`PrintService`, `IpcRendererService`, `WebcamService`, `CanonCameraService`, `LocalizationService`, `ThemeService` и т.д.).
*   **Создание UI Компонентов:** Реализовать UI и логику для компонентов (`Notification`, `Modal`, `FilePicker` и т.д.) и заменить ими соответствующие части кода в скриптах окон.
*   **Тестирование:** Тщательно тестировать каждую вынесенную часть функционала.

Этот этап закладывает фундамент. Следующие шаги будут заключаться в наполнении созданных модулей и компонентов реальной логикой.