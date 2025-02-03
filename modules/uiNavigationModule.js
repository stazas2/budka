const dom = require("./domElements");
const configModule = require("./config");
const { config } = configModule;
const state = require("./state");

async function showScreen(screenId) {
  try {
    console.log(`Switching to screen: ${screenId}`);
    const currentActive = document.querySelector(".screen.active");
    if (currentActive) currentActive.classList.remove("active");

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
        dom.resultImage.src = "";
        const cameraModule = require("./cameraModule");
        cameraModule.stopCamera();
        dom.modal.style.display = "none";
        dom.qrCodeImage.style.display = "none";
        dom.qrCodeAgree.style.display = "initial";
      }

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

      if (screenId === "result-screen") {
        dom.resultTitle.style.display = "block";
      } else {
        dom.resultTitle.style.display = "none";
      }

      if (screenId === "camera-screen") {
        if (config.cameraMode === "canon") {
          dom.video.style.display = "none";
          const liveViewContainer = document.getElementById("liveViewContainer");
          liveViewContainer.style.display = "block";
          const countdownModule = require("./countdownModule");
          countdownModule.startCountdown();
        } else {
          const cameraModule = require("./cameraModule");
          cameraModule.startCamera()
            .then(() => {
              const countdownModule = require("./countdownModule");
              countdownModule.startCountdown();
            })
            .catch((err) => {
              alert("Unable to access the webcam.");
              console.log("Error: " + err);
              state.amountOfStyles === 1
                ? showScreen("gender-screen")
                : showScreen("style-screen");
            });
        }
      }
    } else {
      console.error(`Screen with ID "${screenId}" not found.`);
    }

    if (screenId !== "camera-screen") {
      const countdownModule = require("./countdownModule");
      countdownModule.clearCountdown();
    }

    const logoContainer = document.getElementById("logo-container");
    if (screenId === "camera-screen" || screenId === "result-screen") {
      logoContainer.style.display = "none";
    } else {
      if (config.brandLogoPath) {
        logoContainer.style.display = "block";
      }
    }
  } catch (error) {
    console.error(`Error in showScreen (${screenId}):`, error);
  }
}

module.exports = {
  showScreen
};