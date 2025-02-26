const { config } = require('./config')

/**
 * Starts countdown before taking a photo
 */
function startCountdown() {
  try {
    const countdownElement = document.getElementById("countdown")
    let countdown = config.prePhotoTimer || 5
    const backButton = document.querySelector("#camera-screen .back-button")
    countdownElement.textContent = countdown
    
    const countdownInterval = setInterval(() => {
      countdown--
      if (countdown > 0) {
        countdownElement.textContent = countdown
        backButton.style.opacity = "1"
        if (countdown <= 2 && backButton) {
          backButton.disabled = true
          backButton.style.opacity = "0.5"
        }
      } else {
        clearInterval(countdownInterval)
        countdownElement.textContent = ""
        // Use a custom event to trigger takePicture instead of requiring camera module
        document.dispatchEvent(new CustomEvent('take-picture'))
      }
    }, 1000)
    
    // Store the interval reference so it can be cleared if needed
    window.countdownInterval = countdownInterval
  } catch (error) {
    console.error("Error in startCountdown:", error)
  }
}

/**
 * Stops the countdown if it's running
 */
function stopCountdown() {
  if (window.countdownInterval) {
    clearInterval(window.countdownInterval)
    window.countdownInterval = null
    const countdownElement = document.getElementById("countdown")
    if (countdownElement) {
      countdownElement.textContent = ""
    }
  }
}

module.exports = {
  startCountdown,
  stopCountdown
}
