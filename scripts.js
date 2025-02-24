// scripts.js
const { ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");
const { saveImageWithUtils } = require("./utils/saveUtils");
const QRCode = require("qrcode");
const sharp = require("sharp");

const { getState, setState } = require("./state");
const { initStyleButtons, fetchStyles } = require("./styleHandler");
const { initGenderButtons, setGenderImages } = require("./genderHandler");
const { startCamera, stopCamera, takePicture } = require("./camera");
const { startCountdown } = require("./countdown");
const { sendDateToServer } = require("./imageProcessor");
const { showScreen, updatePrintButtonVisibility } = require("./uiNavigation");
const { updateTexts } = require("./localization");
const { applyTheme, applySettings } = require("./theme");
const { resetInactivityTimer } = require("./inactivity");

// DOM элементы
const styleScreen = document.getElementById("style-screen");
const genderScreen = document.getElementById("gender-screen");
const cameraScreen = document.getElementById("camera-screen");
const processingScreen = document.getElementById("processing-screen");
const resultScreen = document.getElementById("result-screen");
const styleButtonsContainer = document.getElementById("style-buttons");
const countdownElement = document.getElementById("countdown");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const resultImage = document.getElementById("result-image");
const startOverButton = document.getElementById("start-over");
const printPhotoButton = document.getElementById("print-photo");
const backButtons = document.querySelectorAll(".back-button");
const startButton = document.getElementById("start-button");
const continueButton = document.getElementById("gender-continue");
const genderButtons = document.querySelectorAll("#gender-buttons .button-row_item");
const showResultQrBtn = document.getElementById("show-qr-button");
const qrCodeImage = document.getElementById("qr-code-img");
const languageSwitcher = document.getElementById("language-switcher");
const translations = require("./translations.json");

// Инициализация состояния
let config = getState().config;

// Инициализация при загрузке DOM
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM полностью загружен");
  config = getState().config; // Обновляем config после загрузки DOM
  console.log("Конфигурация:", config);
  if (config.cameraMode !== "canon") {
    console.log("Переключение на splash-screen");
    showScreen("splash-screen");
    const splashScreen = document.getElementById("splash-screen");
    if (splashScreen && splashScreen.classList.contains("active")) {
      console.log("splash-screen активирован");
    } else {
      console.error("Ошибка: splash-screen не активирован");
    }
  }
  console.log("Обновление текстов...");
  updateTexts(startButton, printPhotoButton);
  console.log("Инициализация кнопок пола...");
  initGenderButtons(genderButtons, continueButton);
  console.log("Установка изображений пола...");
  setGenderImages();
  console.log("Применение темы...");
  applyTheme(config.theme || "light");
  console.log("Применение настроек...");
  applySettings();
  console.log("Сброс таймера бездействия...");
  resetInactivityTimer(showScreen, stopCamera);
  console.log("Инициализация завершена");
});

// Обработчики событий
startButton.addEventListener("click", () => {
  console.log("Нажата кнопка 'Начать'");
  setState({ selectedGenders: [] });
  genderButtons.forEach((item) => item.classList.remove("selected"));
  showScreen("gender-screen");
  resetInactivityTimer(showScreen, stopCamera);
  console.log("Таймер бездействия сброшен");
});

startOverButton.addEventListener("click", () => {
  console.log("Нажата кнопка 'Начать заново'");
  setState({ selectedStyle: "", videoStream: null, cameraInitialized: false });
  resultImage.src = "";
  stopCamera();
  showScreen("splash-screen");
  resetInactivityTimer(showScreen, stopCamera);
  console.log("Таймер бездействия сброшен");
});

printPhotoButton.addEventListener("click", async () => {
  console.log("Нажата кнопка 'Печать фото'");
  const { config, currentLanguage } = getState();
  printPhotoButton.disabled = true;
  printPhotoButton.textContent = translations[currentLanguage].printButtonTextWaiting;
  setTimeout(() => {
    printPhotoButton.disabled = false;
    printPhotoButton.textContent = translations[currentLanguage].printButtonText;
  }, config?.HotFolder ? 2000 : 4000);

  if (resultImage && resultImage.src) {
    const imageData = resultImage.src;
    const isLandscape = resultImage.width > resultImage.height;
    if (config?.HotFolder) {
      await saveImageWithUtils("copyDirectory", imageData);
      console.log("Фото отправлено в HotFolder");
    } else {
      ipcRenderer.send("print-photo", { imageData, isLandscape });
      console.log("Фото отправлено на печать");
    }
  } else {
    console.error("Нет фото для печати.");
  }
  resetInactivityTimer(showScreen, stopCamera);
  console.log("Таймер бездействия сброшен");
});

backButtons.forEach((button) => {
  button.addEventListener("click", () => {
    console.log("Нажата кнопка 'Назад'");
    const currentScreen = document.querySelector(".screen.active");
    switch (currentScreen.id) {
      case "style-screen":
        setState({ selectedGenders: [] });
        genderButtons.forEach((item) => item.classList.remove("selected"));
        showScreen("gender-screen");
        console.log("Переход на экран выбора пола");
        break;
      case "gender-screen":
        setState({ selectedGenders: [] });
        genderButtons.forEach((item) => item.classList.remove("selected"));
        showScreen("splash-screen");
        console.log("Переход на начальный экран");
        break;
      case "camera-screen":
        if (!button.disabled) {
          stopCamera();
          showScreen("style-screen");
          console.log("Переход на экран выбора стиля");
        }
        break;
    }
    resetInactivityTimer(showScreen, stopCamera);
    console.log("Таймер бездействия сброшен");
  });
});

languageSwitcher.addEventListener("click", () => {
  console.log("Переключение языка");
  const { currentLanguage, config } = getState();
  const newLanguage = currentLanguage === "ru" ? "kz" : "ru";
  setState({ currentLanguage: newLanguage });
  config.language.current = newLanguage;
  fs.writeFileSync(path.join(__dirname, "config.json"), JSON.stringify(config, null, 2));
  updateTexts(startButton, printPhotoButton);
  resetInactivityTimer(showScreen, stopCamera);
  console.log("Таймер бездействия сброшен");
});

showResultQrBtn.addEventListener("click", () => {
  console.log("Показ QR-кода");
  qrCodeImage.style.display = "initial";
  resetInactivityTimer(showScreen, stopCamera);
  console.log("Таймер бездействия сброшен");
});

// Передача коллбэков для управления экранами
const onProcessing = () => {
  console.log("Переход на экран обработки");
  showScreen("processing-screen");
};
const onResult = () => {
  console.log("Переход на экран результата");
  showScreen("result-screen");
};

// Пример вызова takePicture с передачей управления экраном через imageProcessor
async function handleTakePicture() {
  console.log("Вызов функции takePicture...");
  await takePicture(onProcessing, onResult, resultImage);
}

// Слушатели событий для сброса таймера бездействия
["click", "mousemove", "keypress", "touchstart"].forEach((event) => {
  document.addEventListener(event, () => {
    // console.log(`Событие ${event} обнаружено, сброс таймера бездействия`);
    // resetInactivityTimer(showScreen, stopCamera);
  });
});

// Экспорт необходимых переменных и функций
module.exports = {
  styleScreen,
  genderScreen,
  cameraScreen,
  processingScreen,
  resultScreen,
  styleButtonsContainer,
  countdownElement,
  video,
  canvas,
  resultImage,
  startOverButton,
  printPhotoButton,
  backButtons,
  startButton,
  continueButton,
  genderButtons,
  showResultQrBtn,
  qrCodeImage,
  languageSwitcher,
  onProcessing,
  onResult,
  handleTakePicture,
  config // Добавляем config в экспорт
};