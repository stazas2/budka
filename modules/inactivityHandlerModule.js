// -*- coding: utf-8 -*-
const configModule = require("./config");
const { config } = configModule;
const uiNavigationModule = require("./uiNavigationModule");
const state = require("./state");
const dom = require("./domElements");

const inactivityTimeout = config.inactivityTimeout || 60000;
let inactivityTimer;
function resetInactivityTimer() {
  try {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      uiNavigationModule.showScreen("splash-screen");
      state.selectedStyle = "";
      dom.resultImage.src = "";
      const cameraModule = require("./cameraModule");
      cameraModule.stopCamera();
    }, inactivityTimeout);
  } catch (error) {
    console.error("Error in resetInactivityTimer:", error);
  }
}
function startInactivityTimer() {
  // Логика обработки неактивности
  resetInactivityTimer();
}
["click", "mousemove", "keypress", "touchstart"].forEach((event) => {
  document.addEventListener(event, resetInactivityTimer);
});
resetInactivityTimer();

module.exports = {
  startInactivityTimer
};