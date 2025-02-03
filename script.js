// script.js
console.log("Загрузка script.js началась");

// Оставляем только один обработчик DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded fired");
  try {
    // Импорт основных модулей
    const configModule = require("./modules/config");
    const { config } = configModule;
    const dom = require("./modules/domElements");
    const state = require("./modules/state");
    const theme = require("./modules/themeHandlingModule");
    const uiNavigation = require("./modules/uiNavigationModule");
    const cameraModule = require("./modules/cameraModule");
    const countdown = require("./modules/countdownModule");
    const genderHandling = require("./modules/genderHandling");
    const styleHandling = require("./modules/styleHandling");
    const imageProcessing = require("./modules/imageProcessingModule");
    const printing = require("./modules/printingModule");
    const localization = require("./modules/localizationModule");
    const inactivity = require("./modules/inactivityHandlerModule");
    const eventListeners = require("./modules/eventListeners");

    // Добавляем обработчик для кнопки "Начать"
    const startBtn = document.getElementById("start-button");
    if (startBtn) {
      startBtn.addEventListener("click", () => {
        console.log("Клик по кнопке 'Начать'");
        // Инициализируем кнопки гендера перед показом экрана
        genderHandling.initGenderButtons();
        uiNavigation.showScreen("gender-screen");
      });
    }

    // Применяем тему и настройки
    theme.applyTheme(config.theme || "default");
    theme.applySettings();

    // Стартуем обработчик неактивности
    inactivity.startInactivityTimer();

    // Обновляем тексты интерфейса
    localization.updateTexts();

    // Переходим на заставку (splash-screen)
    uiNavigation.showScreen("splash-screen");

    // Дополнительная инициализация (например, гендер, стиль) происходит в eventListeners
  } catch (error) {
    console.error("Error during initialization:", error);
  }
});
