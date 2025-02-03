const dom = require("./domElements");
const state = require("./state");
const configModule = require("./config");
const { config } = configModule;

function showScreen(screenId) {
  try {
    console.log(`Switching to screen: ${screenId}`);
    // Скрываем все экраны
    document.querySelectorAll(".screen").forEach((screen) => screen.classList.remove("active"));
    // Находим и показываем целевой экран по id
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
      targetScreen.classList.add("active");

      if (screenId === "style-screen") {
        dom.styleButtonsContainer.classList.add("hide-scrollbar");
        setTimeout(() => {
          dom.styleButtonsContainer.classList.remove("hide-scrollbar");
        }, 4000);
        const styleButtons = document.getElementById("style-buttons");
        if (styleButtons) styleButtons.scrollTop = 0;
      }

      if (screenId === "splash-screen") {
        state.selectedStyle = "";
        if (dom.resultImage) {
          dom.resultImage.src = "";
        } else {
          console.warn("resultImage element not found");
        }
        if (config.cameraMode === "canon") {
          const canonModule = require("./canonModule");
          if (typeof canonModule.endLiveView === "function") {
            canonModule.endLiveView();
          }
        } else {
          const cameraModule = require("./cameraModule");
          if (typeof cameraModule.stopCamera === "function") {
            cameraModule.stopCamera();
          }
        }
        if (dom.modal) dom.modal.style.display = "none";
        if (dom.qrCodeImage) dom.qrCodeImage.style.display = "none";
        if (dom.qrCodeAgree) dom.qrCodeAgree.style.display = "initial";
      }
  
      // Настройка кнопки "Назад"
      const backButton = targetScreen.querySelector(".back-button");
      if (backButton) {
        if (screenId === "splash-screen" || screenId === "processing-screen") {
          backButton.disabled = true;
          backButton.style.display = "block";
        } else if (screenId === "result-screen") {
          backButton.style.display = "none";
        } else {
          backButton.disabled = false;
          backButton.style.display = "block";
        }
      }
  
      if (screenId !== "camera-screen") {
        const countdownModule = require("./countdownModule");
        countdownModule.clearCountdown();
      }

      if (screenId === "camera-screen") {
        // Автоматически запускаем отсчет при показе экрана камеры
        setTimeout(() => {
            const countdown = require("./countdownModule");
            countdown.startCountdown();
        }, 1000); // Даем секунду на инициализацию камеры
      }
  
      const logoContainer = document.getElementById("logo-container");
      if (logoContainer) {
        if (screenId === "camera-screen" || screenId === "result-screen") {
          logoContainer.style.display = "none";
        } else {
          logoContainer.style.display = config.brandLogoPath ? "block" : "none";
        }
      } else {
        console.warn("Logo container not found");
      }
    } else {
      console.error(`Screen with ID "${screenId}" not found.`);
    }
  } catch (error) {
    console.error(`Error in showScreen (${screenId}):`, error);
  }
}

// Удалён дублирующий код showScreen

module.exports = { showScreen };
