// uiNavigation.js
const { startCamera, stopCamera } = require("./camera");
const { startCountdown } = require("./countdown");
const { getState } = require("./state");

function showScreen(screenId) {
  const screens = ["splash-screen", "style-screen", "gender-screen", "camera-screen", "processing-screen", "result-screen"];
  console.log(`Попытка переключения на экран: ${screenId}`);
  screens.forEach((id) => {
    const screen = document.getElementById(id);
    if (screen) {
      screen.classList.toggle("active", id === screenId);
      console.log(`Экран ${id} ${id === screenId ? "активирован" : "деактивирован"}`);
    } else {
      console.error(`Экран ${id} не найден`);
    }
  });

  const { resultImage, video } = require("./scripts"); // Импорт video из scripts.js
  if (screenId === "camera-screen") {
    const onProcessing = () => {
      console.log("Переход на экран обработки");
      showScreen("processing-screen");
    };
    const onResult = () => {
      console.log("Переход на экран результата");
      showScreen("result-screen");
    };
    console.log("Запуск камеры и обратного отсчёта...");
    startCamera(video)
      .then(() => {
        console.log("Камера инициализирована, запуск обратного отсчёта");
        startCountdown(video, onProcessing, onResult, resultImage);
      })
      .catch((error) => {
        console.error("Ошибка при инициализации камеры, возврат на экран стилей:", error.message);
        showScreen("style-screen");
      });
  } else {
    console.log("Остановка камеры при переключении экрана");
    stopCamera();
  }
}

function updatePrintButtonVisibility() {
  const { config } = getState();
  const { printPhotoButton } = require("./scripts");
  printPhotoButton.style.display = config.printButtonVisible ? "block" : "none";
  console.log(`Кнопка печати ${config.printButtonVisible ? "видима" : "скрыта"}`);
}

module.exports = { showScreen, updatePrintButtonVisibility };