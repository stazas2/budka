// inactivity.js
const { loadConfig } = require("./utils/configLoader")
const { showScreen, stopCamera } = require("./uiNavigation")

function resetInactivityTimer() {
  const config = loadConfig()
  clearTimeout(require("./scripts").inactivityTimer)
  require("./scripts").inactivityTimer = setTimeout(() => {
    showScreen("splash-screen")
    stopCamera()
  }, config.inactivityTimeout || 60000)
}

module.exports = { resetInactivityTimer }