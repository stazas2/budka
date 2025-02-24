// countdown.js
const { loadConfig } = require("./utils/configLoader")
const { takePicture } = require("./camera")
const { getState } = require("./state")

function startCountdown(onProcessing, onResult, resultImage) {
  const { cameraInitialized, config } = getState()
  const { video } = require("./scripts")
  if (!cameraInitialized && config.cameraMode === "pc") {
    video.onloadedmetadata = () => {
      setState({ cameraInitialized: true })
      beginCountdown(onProcessing, onResult, resultImage)
    }
  } else {
    beginCountdown(onProcessing, onResult, resultImage)
  }
}

function beginCountdown(onProcessing, onResult, resultImage) {
  const config = loadConfig()
  const { countdownElement } = require("./scripts")
  let countdown = config.prePhotoTimer || 5
  const interval = setInterval(async () => {
    countdown--
    countdownElement.textContent = countdown > 0 ? countdown : ""
    if (countdown <= 0) {
      clearInterval(interval)
      await takePicture(onProcessing, onResult, resultImage)
    }
  }, 1000)
}

module.exports = { startCountdown }