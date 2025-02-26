const fs = require('fs')
const { config } = require('./config')

/**
 * Applies selected theme to the UI
 * @param {string} theme - Theme name ('light' or 'dark')
 */
function applyTheme(theme = 'light') {
  try {
    const themeConfig = config[`${theme}Theme`]
    document.body.classList.remove("light", "dark")
    document.body.classList.add(theme)

    if (themeConfig) {
      document.documentElement.style.setProperty(
        "--background-color",
        theme === "light"
          ? config.lightTheme.backgroundColor
          : config.darkTheme.backgroundColor
      )

      document.documentElement.style.setProperty(
        "--background-image",
        theme === "light"
          ? `url("${config.lightTheme.backgroundImage.replace(/\\\\/g, "/")}")`
          : `url("${config.darkTheme.backgroundImage.replace(/\\\\/g, "/")}")`
      )

      // Check theme, if no image and color or they're invalid, enable animation
      if (
        (config.theme === "light" &&
          !fs.existsSync(config.lightTheme.backgroundImage) &&
          config.lightTheme.backgroundColor === "") ||
        (config.theme === "dark" &&
          !fs.existsSync(config.darkTheme.backgroundImage) &&
          config.darkTheme.backgroundColor === "")
      ) {
        config.animationEnabled = true
      }

      document.documentElement.style.setProperty(
        "--text-color",
        theme === "light"
          ? config.lightTheme.lightTextColor
          : config.darkTheme.darkTextColor
      )
    }
  } catch (error) {
    console.error("Error in applyTheme:", error)
  }
}

/**
 * Applies general application settings
 */
function applySettings() {
  try {
    const appTheme =
      config.theme === "light" ? config.lightTheme : config.darkTheme

    if (config.animationEnabled) {
      document.body.classList.add("animated-background")
      document.body.style.setProperty(
        "--animated-background",
        config.animatedBackground
          ? config.animatedBackground
          : appTheme.backgroundColor
      )
    } else {
      document.body.classList.remove("animated-background")
    }
    document.documentElement.style.setProperty(
      "--backdrop-blur",
      config.backdropBlur
    )
  } catch (error) {
    console.error("Error in applySettings:", error)
  }
}

module.exports = {
  applyTheme,
  applySettings
}
