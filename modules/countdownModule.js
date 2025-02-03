// modules/countdownModule.js
const dom = require("./domElements");
const configModule = require("./config");
const { config } = configModule;
const state = require("./state");
const cameraModule = require("./cameraModule");
const uiNavigation = require("./uiNavigationModule");

let countdownInterval;
function startCountdown() {
  try {
    if (!state.cameraInitialized && config.cameraMode === "pc") {
      dom.video.onloadedmetadata = () => {
        state.cameraInitialized = true;
        beginCountdown();
      };
    } else {
      beginCountdown();
    }
  } catch (error) {
    console.error("Error in startCountdown:", error);
  }
}
function beginCountdown() {
  try {
    let countdown = config.prePhotoTimer || 5;
    dom.countdownElement.textContent = countdown;
    countdownInterval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        dom.countdownElement.textContent = countdown;
      } else {
        clearInterval(countdownInterval);
        dom.countdownElement.textContent = "";
        cameraModule.takePicture();
      }
    }, 1000);
  } catch (error) {
    console.error("Error in beginCountdown:", error);
  }
}
function clearCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
    dom.countdownElement.textContent = "";
  }
}
module.exports = { startCountdown, beginCountdown, clearCountdown };
