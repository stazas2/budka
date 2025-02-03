// modules/printingModule.js
const { ipcRenderer } = require("electron");
const dom = require("./domElements");
const configModule = require("./config");
const { config, translations } = configModule;
const state = require("./state");

function updatePrintButtonVisibility() {
  const printButton = require("./domElements").printPhotoButton;
  if (printButton) {
    printButton.style.display = "block";
  } else {
    console.warn("Print photo button not found");
  }
}

if (dom.startOverButton) {
  dom.startOverButton.addEventListener("click", () => {
    const uiNavigation = require("./uiNavigationModule");
    state.selectedStyle = "";
    dom.resultImage.src = "";
    const cameraModule = require("./cameraModule");
    cameraModule.stopCamera();
    uiNavigation.showScreen("splash-screen");
    dom.qrCodeImage.style.display = "none";
    dom.qrCodeAgree.style.display = "initial";
  });
}

if (dom.printPhotoButton) {
  dom.printPhotoButton.addEventListener("click", () => {
    dom.printPhotoButton.disabled = true;
    dom.printPhotoButton.textContent = translations[config.language.current].printButtonTextWaiting;
    setTimeout(() => {
      dom.printPhotoButton.disabled = false;
      dom.printPhotoButton.textContent = translations[config.language.current].printButtonText;
    }, 4000);
    if (dom.resultImage && dom.resultImage.src) {
      const imageData = dom.resultImage.src;
      const isLandscape = dom.resultImage.width > dom.resultImage.height;
      ipcRenderer.send("print-photo", { imageData, isLandscape });
    } else {
      console.error("Изображение для печати не найдено.");
    }
  });
}

ipcRenderer.on("print-photo-response", (event, success) => {
  if (success) {
    console.log("Печать выполнена успешно.");
  } else {
    console.error("Ошибка печати.");
  }
});

module.exports = { updatePrintButtonVisibility };
