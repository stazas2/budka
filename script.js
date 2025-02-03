const { ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");

// Инициализируем модули (импорт кода через require)
require("./modules/config");
require("./modules/domElements");
require("./modules/state");
require("./modules/styleHandling");
require("./modules/genderHandling");
require("./modules/cameraModule");
require("./modules/countdownModule");
require("./modules/imageProcessingModule");
require("./modules/uiNavigationModule");
require("./modules/printingModule");
require("./modules/localizationModule");
require("./modules/themeHandlingModule");
require("./modules/inactivityHandlerModule");
require("./modules/canonModule");
require("./modules/eventListeners");

// Применяем тему и настройки
const themeHandling = require("./modules/themeHandlingModule");
const configModule = require("./modules/config");
themeHandling.applyTheme(configModule.config.theme || "light");
themeHandling.applySettings();