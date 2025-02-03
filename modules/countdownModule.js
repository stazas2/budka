// modules/countdownModule.js
const dom = require("./domElements");
const configModule = require("./config");
const { config } = configModule;
const state = require("./state");
const cameraModule = require("./cameraModule");
const uiNavigation = require("./uiNavigationModule");
const imageProcessing = require("./imageProcessingModule");

let countdownTimer;

function startCountdown(onComplete) {
    console.log("Starting countdown");
    clearCountdown();
    let timeLeft = config.prePhotoTimer || 4;
    
    if (dom.countdownElement) {
        dom.countdownElement.style.display = 'block';
        dom.countdownElement.textContent = timeLeft;
        
        countdownTimer = setInterval(() => {
            timeLeft--;
            if (timeLeft > 0) {
                dom.countdownElement.textContent = timeLeft;
            } else {
                clearCountdown();
                if (onComplete) onComplete();
            }
        }, 1000);
    }
}

function clearCountdown() {
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
    if (dom.countdownElement) {
        dom.countdownElement.style.display = 'none';
    }
}

module.exports = { startCountdown, clearCountdown };
