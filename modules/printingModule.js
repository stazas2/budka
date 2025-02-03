// -*- coding: utf-8 -*-
const { ipcRenderer } = require("electron");
const dom = require("./domElements");
const configModule = require("./config");
const { config, translations } = configModule;
const state = require("./state");

function updatePrintButtonVisibility() {
  if (config.printButtonVisible) {
    dom.printPhotoButton.style.display = "block";
  } else {
    dom.printPhotoButton.style.display = "none";
  }
}

if (dom.startOverButton) {
  dom.startOverButton.addEventListener("click", () => {
    const uiNavigationModule = require("./uiNavigationModule");
    state.selectedStyle = "";
    dom.resultImage.src = "";
    const cameraModule = require("./cameraModule");
    cameraModule.stopCamera();
    uiNavigationModule.showScreen("splash-screen");
    dom.qrCodeImage.style.display = "none";
    dom.qrCodeAgree.style.display = "initial";
  });
}

if (dom.printPhotoButton) {
  dom.printPhotoButton.addEventListener("click", () => {
    dom.printPhotoButton.disabled = true;
    dom.printPhotoButton.textContent =
      translations[config.language.current].printButtonTextWaiting;
    setTimeout(() => {
      dom.printPhotoButton.disabled = false;
      dom.printPhotoButton.textContent =
        translations[config.language.current].printButtonText;
    }, 4000);

    if (dom.resultImage && dom.resultImage.src) {
      const imageData = dom.resultImage.src;
      const isLandscape = dom.resultImage.width > dom.resultImage.height;
      console.log(`isLandscape: ${isLandscape}: ${dom.resultImage.width}x${dom.resultImage.height}`);
      ipcRenderer.send("print-photo", {
        imageData: imageData,
        isLandscape,
      });
    } else {
      console.error("Image not found for printing.");
    }
  });
}

ipcRenderer.on("print-photo-response", (event, success) => {
  if (success) {
    console.log("Print job completed successfully.");
  } else {
    console.error("Print job failed.");
  }
});

module.exports = {
  updatePrintButtonVisibility
};