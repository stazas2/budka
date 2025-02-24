// uiNavigation.js
const { startCamera, stopCamera } = require("./camera")
const { startCountdown } = require("./countdown")
const { getState } = require("./state")

function showScreen(screenId) {
  const screens = ["style-screen", "gender-screen", "camera-screen", "processing-screen", "result-screen"]
  screens.forEach((id) => {
    const screen = document.getElementById(id)
    if (screen) screen.classList.toggle("active", id === screenId)
  })

  const { resultImage } = require("./scripts")
  if (screenId === "camera-screen") {
    const onProcessing = () => showScreen("processing-screen")
    const onResult = () => showScreen("result-screen")
    startCamera().then(() => startCountdown(onProcessing, onResult, resultImage)).catch(() => showScreen("style-screen"))
  } else {
    stopCamera()
  }
}

function updatePrintButtonVisibility() {
  const { config } = getState()
  const { printPhotoButton } = require("./scripts")
  printPhotoButton.style.display = config.printButtonVisible ? "block" : "none"
}

module.exports = { showScreen, updatePrintButtonVisibility }