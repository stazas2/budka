const { config } = require('./config');

/**
 * Starts a countdown timer and triggers the photo capture when finished
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
  try {
    if (window.countdownInterval) {
      clearInterval(window.countdownInterval);
      window.countdownInterval = null;
      
      // Clear countdown text
      const countdownElement = document.getElementById("countdown");
      if (countdownElement) countdownElement.textContent = "";
      
      // Re-enable back button if it exists
      const backButton = document.querySelector("#camera-screen .back-button");
      if (backButton) {
        backButton.disabled = false;
        backButton.style.opacity = "1";
      }
      
      console.log("Countdown stopped");
    }
  } catch (error) {
    console.error("Error in stopCountdown:", error);
  }
}

// Register event handlers
document.addEventListener('start-countdown', () => {
  startCountdown();
});

document.addEventListener('stop-countdown', () => {
  stopCountdown();
});

module.exports = {
  startCountdown,
  stopCountdown
};
