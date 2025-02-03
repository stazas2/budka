// modules/localizationModule.js
const dom = require("./domElements");
const configModule = require("./config");
const { config, translations } = configModule;
const printingModule = require("./printingModule");

function updateTexts() {
  try {
    const texts = translations[config.language.current];
    if (!texts) return;
    const screenTitles = {
      "splash-screen": texts.welcomeMessage,
      "style-screen": texts.styleScreenTitle,
      "gender-screen": texts.genderScreenTitle,
      "camera-screen": texts.cameraScreenTitle,
      "processing-screen": texts.processingScreenTitle,
      "result-screen": texts.resultScreenTitle
    };
    for (const [screenId, titleText] of Object.entries(screenTitles)) {
      const screen = document.getElementById(screenId);
      if (screen) {
        const titleElement = screen.querySelector("h1");
        if (titleElement) {
          titleElement.textContent = titleText;
        }
      }
    }
    if (dom.startButton) {
      dom.startButton.textContent = texts.startButtonText;
    }
    const continueButton = document.getElementById("gender-continue");
    if (continueButton) {
      continueButton.textContent = texts.continueButtonText;
    }
    if (dom.showResultQrBtn) {
      dom.showResultQrBtn.textContent = texts.showResultQrBtn;
    }
    if (dom.printPhotoButton) {
      dom.printPhotoButton.textContent = texts.printButtonText;
    }
    if (dom.startOverButton) {
      dom.startOverButton.textContent = texts.startOverButtonText;
    }
    const loaderTexts = document.getElementsByClassName("loader-text");
    if (loaderTexts) {
      [...loaderTexts].forEach((el) => (el.textContent = texts.loaderText));
    }
    const genderButtons = document.querySelectorAll("#gender-buttons .button");
    genderButtons.forEach((button) => {
      const genderKey = button.getAttribute("data-gender");
      button.textContent = texts.genders[genderKey];
    });
    if (dom.languageSwitcher) {
      dom.languageSwitcher.textContent = config.language.current === "ru" ? "KK" : "RU";
      dom.languageSwitcher.style.display = config.language.showSwitcher ? "block" : "none";
    }
    printingModule.updatePrintButtonVisibility();
  } catch (error) {
    console.error("Error in updateTexts:", error);
  }
}

module.exports = { updateTexts };
