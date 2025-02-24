// theme.js
const { loadConfig } = require("./utils/configLoader")

function applyTheme(theme) {
  document.body.classList.remove("light", "dark")
  document.body.classList.add(theme)
}

function applySettings() {
  const config = loadConfig()
  if (config.animationEnabled) {
    document.body.classList.add("animated-background")
  }
}

module.exports = { applyTheme, applySettings }