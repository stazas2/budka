// modules/inactivityHandlerModule.js
const uiNavigation = require("./uiNavigationModule");
const dom = require("./domElements");
const configModule = require("./config");
const { config } = configModule;

let inactivityTimer;

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    const currentScreen = document.querySelector(".screen.active");
    if (currentScreen && currentScreen.id !== "splash-screen") {
      // Очищаем состояние
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
      
      // Возвращаемся на начальный экран
      uiNavigation.showScreen("splash-screen");
      
      // Сброс модального окна если оно открыто
      if (dom.modal) dom.modal.style.display = "none";
      if (dom.qrCodeImage) dom.qrCodeImage.style.display = "none";
      if (dom.qrCodeAgree) dom.qrCodeAgree.style.display = "initial";
    }
  }, config.inactivityTimeout);
}

function startInactivityTimer() {
  resetInactivityTimer();
  ["click", "mousemove", "keypress", "touchstart"].forEach((event) => {
    document.addEventListener(event, resetInactivityTimer);
  });
}

module.exports = { startInactivityTimer };
