// -*- coding: utf-8 -*-
const dom = require("./domElements");
const configModule = require("./config");
const { config } = configModule;
const cameraModule = require("./cameraModule");
const uiNavigationModule = require("./uiNavigationModule");
let countdownInterval;

function startCountdown() {
  try {
    const state = require("./state");
    if (!state.cameraInitialized && config.cameraMode === "pc") {
      console.log("Camera not ready, waiting for initialization...");
      dom.video.onloadedmetadata = () => {
        state.cameraInitialized = true;
        console.log("Camera initialized, starting countdown");
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
    const backButton = document.querySelector("#camera-screen .back-button");
    dom.countdownElement.textContent = countdown;
    countdownInterval = setInterval(async () => {
      countdown--;
      if (countdown > 0) {
        dom.countdownElement.textContent = countdown;
        backButton.style.opacity = "1";
        if (countdown <= 2 && backButton) {
          backButton.disabled = true;
          backButton.style.opacity = "0.5";
        }
      } else {
        clearInterval(countdownInterval);
        dom.countdownElement.textContent = "";
        await cameraModule.takePicture();
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

module.exports = {
  startCountdown,
  beginCountdown,
  clearCountdown
};