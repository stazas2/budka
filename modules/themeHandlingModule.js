const dom = require("./domElements");
const configModule = require("./config");
const { config } = configModule;
const fs = require("fs");
const path = require("path");

function applyTheme(theme) {
  try {
    const themeConfig = config[`${theme}Theme`];
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);

    if (themeConfig) {
      document.documentElement.style.setProperty(
        "--background-color",
        theme === "light" ? config.lightTheme.backgroundColor : config.darkTheme.backgroundColor
      );

      document.documentElement.style.setProperty(
        "--background-image",
        theme === "light"
          ? `url("${path.join(config.basePath, config.lightTheme.backgroundImage).replace(/\\/g, "/")}")`
          : `url("${path.join(config.basePath, config.darkTheme.backgroundImage).replace(/\\/g, "/")}")`
      );

      if (
        (theme === "light" &&
          !fs.existsSync(path.join(config.basePath, config.lightTheme.backgroundImage)) &&
          config.lightTheme.backgroundColor === "") ||
        (theme === "dark" &&
          !fs.existsSync(path.join(config.basePath, config.darkTheme.backgroundImage)) &&
          config.darkTheme.backgroundColor === "")
      ) {
        config.animationEnabled = true;
      }

      document.documentElement.style.setProperty(
        "--text-color",
        theme === "light" ? config.lightTheme.lightTextColor : config.darkTheme.darkTextColor
      );
    }
  } catch (error) {
    console.error("Error in applyTheme:", error);
  }
}

function applySettings() {
  try {
    const appTheme = config.theme === "light" ? config.lightTheme : config.darkTheme;
    if (config.animationEnabled) {
      document.body.classList.add("animated-background");
      document.body.style.setProperty(
        "--animated-background",
        config.animatedBackground ? config.animatedBackground : appTheme.backgroundColor
      );
    } else {
      document.body.classList.remove("animated-background");
    }
    document.documentElement.style.setProperty("--backdrop-blur", config.backdropBlur);
  } catch (error) {
    console.error("Error in applySettings:", error);
  }
}

module.exports = {
  applyTheme,
  applySettings
};