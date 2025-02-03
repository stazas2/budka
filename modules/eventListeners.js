console.log("Модуль eventListeners загружен");
// modules/eventListeners.js
const dom = require("./domElements");
const localization = require("./localizationModule");
const genderHandling = require("./genderHandling");
const uiNavigation = require("./uiNavigationModule");

// После загрузки DOM обновляем тексты, инициализируем кнопки выбора пола и добавляем обработчик "Начать"
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded сработал");
  localization.updateTexts();
  genderHandling.initGenderButtons();
  
  // Только один обработчик для кнопки "Начать"
  const startButton = document.querySelector("#splash-screen #start-button");
  console.log("Поиск кнопки 'Начать':", startButton);
  
  if (startButton) {
    startButton.onclick = (event) => {
      event.preventDefault();
      console.log("Клик по кнопке start-button");
      uiNavigation.showScreen("gender-screen");
    };
  } else {
    console.error("Кнопка 'Начать' не найдена в DOM");
  }
});

// Пример обработки события для кнопки «Назад»
if (dom.backButtons) {
  dom.backButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const currentScreen = document.querySelector(".screen.active");
      if (currentScreen) {
        switch (currentScreen.id) {
          case "style-screen":
            uiNavigation.showScreen("gender-screen");
            break;
          case "gender-screen":
            uiNavigation.showScreen("splash-screen");
            break;
          case "camera-screen":
            uiNavigation.showScreen("style-screen");
            break;
          default:
            uiNavigation.showScreen("splash-screen");
            break;
        }
      }
    });
  });
}

// Пример переключателя полноэкранного режима
const fullscreenToggle = document.getElementById("fullscreen-toggle");
if (fullscreenToggle) {
  let clickCount = 0;
  let timer;
  fullscreenToggle.addEventListener("click", () => {
    clickCount++;
    if (clickCount === 3) {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => console.error(err));
      } else {
        document.exitFullscreen();
      }
      clickCount = 0;
      clearTimeout(timer);
    } else {
      clearTimeout(timer);
      timer = setTimeout(() => {
        clickCount = 0;
      }, 500);
    }
  });
}
