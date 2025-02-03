// -*- coding: utf-8 -*-
const dom = require("./domElements");
const localizationModule = require("./localizationModule");
const genderHandling = require("./genderHandling");
const uiNavigationModule = require("./uiNavigationModule");
const themeHandlingModule = require("./themeHandlingModule");
const state = require("./state");

document.addEventListener("DOMContentLoaded", () => {
  const configModule = require("./config");
  const { config } = configModule;
  if (config.cameraMode !== "canon") {
    uiNavigationModule.showScreen("splash-screen");
  }
  localizationModule.updateTexts();
  genderHandling.initGenderButtons();
  genderHandling.setGenderImages();
});

if (dom.backButtons && dom.backButtons.forEach) {
  dom.backButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const currentScreen = document.querySelector(".screen.active");
      switch (currentScreen.id) {
        case "style-screen":
          state.selectedGenders = [];
          document.querySelectorAll("#gender-buttons .button-row_item").forEach((item) => {
            item.classList.remove("selected");
          });
          uiNavigationModule.showScreen("gender-screen");
          break;
        case "gender-screen":
          state.selectedGenders = [];
          document.querySelectorAll("#gender-buttons .button-row_item").forEach((item) => {
            item.classList.remove("selected");
          });
          uiNavigationModule.showScreen("splash-screen");
          break;
        case "camera-screen":
          if (!button.disabled && state.amountOfStyles > 1) {
            const countdownModule = require("./countdownModule");
            countdownModule.clearCountdown();
            dom.countdownElement.textContent = "";
            const cameraModule = require("./cameraModule");
            cameraModule.stopCamera();
            uiNavigationModule.showScreen("style-screen");
          } else if (state.amountOfStyles === 1) {
            state.selectedGenders = [];
            document.querySelectorAll("#gender-buttons .button-row_item").forEach((item) => {
              item.classList.remove("selected");
            });
            uiNavigationModule.showScreen("gender-screen");
          }
          break;
      }
    });
  });
} else {
  console.warn("dom.backButtons is undefined");
}

if (dom.genderButtons && dom.genderButtons.forEach) {
  dom.genderButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      const gender = button.getAttribute("data-gender");
      if (button.classList.contains("selected")) {
        button.classList.remove("selected");
        state.selectedGenders = state.selectedGenders.filter(g => g !== gender);
      } else {
        button.classList.add("selected");
        state.selectedGenders.push(gender);
      }
      console.log("Selected genders:", state.selectedGenders);
    });
  });
} else {
  console.warn("dom.genderButtons is undefined");
}

window.addEventListener("resize", handleOrientationChange);
function handleOrientationChange() {
  try {
    if (window.innerHeight > window.innerWidth) {
      console.log("Портретная ориентация");
    } else {
      console.log("Ландшафтная ориентация");
    }
  } catch (error) {
    console.error("Error in handleOrientationChange:", error);
  }
}
handleOrientationChange();

let loaderMessages = require("./config").translations[require("./config").config.language.current].loaderMessages || [];
let currentMessageIndex = 0;
function createFloatingText(message) {
  const textElement = document.createElement("div");
  const progressBarRect = dom.progressBar.getBoundingClientRect();
  textElement.className = "floating-text";
  textElement.innerText = message;
  const randomX = Math.random() * 35 + 25;
  const xPosition = (progressBarRect.width * randomX) / 100;
  const randomY = Math.random() * 40 - 20;
  textElement.style.position = "absolute";
  textElement.style.left = `${progressBarRect.left / 1.2 + xPosition}px`;
  textElement.style.bottom = `${progressBarRect.bottom + randomY - window.innerHeight}px`;
  const processingScreen = document.getElementById("processing-screen");
  processingScreen.appendChild(textElement);
  setTimeout(() => {
    processingScreen.removeChild(textElement);
  }, 2000);
}
function displayNextMessage() {
  const processingScreen = document.getElementById("processing-screen");
  if (processingScreen.classList.contains("active")) {
    if (loaderMessages.length > 0) {
      createFloatingText(loaderMessages[currentMessageIndex]);
      currentMessageIndex = (currentMessageIndex + 1) % loaderMessages.length;
    }
  }
}
setInterval(displayNextMessage, 2000);

const customCheckboxQr = document.querySelector(".custom-checkbox-qr");
if (customCheckboxQr) {
  customCheckboxQr.addEventListener("click", function (event) {
    dom.qrCodeImage.style.display = "none";
    showModal();
  });
}
function showModal() {
  if (dom.modal) {
    dom.modal.style.display = "flex";
  }
}
if (dom.modal) {
  dom.modal.addEventListener("click", function (event) {
    if (event.target === dom.modal || event.target.classList.contains("close-modal")) {
      dom.modal.style.display = "none";
    }
  });
}
if (dom.showResultQrBtn) {
  dom.showResultQrBtn.addEventListener("click", () => {
    dom.qrCodeAgree.style.display = "none";
    dom.qrCodeImage.style.display = "initial";
    showModal();
  });
}
const fullscreenToggleButton = document.getElementById("fullscreen-toggle");
if (fullscreenToggleButton) {
  let clickCount = 0;
  let clickTimer;
  fullscreenToggleButton.addEventListener("click", function () {
    clickCount++;
    if (clickCount === 3) {
      clickCount = 0;
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.error(`Full-screen error: ${err.message}`);
        });
        clearTimeout(clickTimer);
      } else {
        document.exitFullscreen();
        clearTimeout(clickTimer);
      }
    }
    if (!clickTimer) {
      clickTimer = setTimeout(() => {
        clickCount = 0;
      }, 500);
    } else {
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => {
        clickCount = 0;
      }, 500);
    }
  });
} else {
  console.warn("fullscreenToggleButton is null");
}