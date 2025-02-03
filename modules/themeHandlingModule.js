// modules/themeHandlingModule.js
const dom = require("./domElements");
const configModule = require("./config");
const { config, basePath } = configModule;
const fs = require("fs");
const path = require("path");

function applyTheme(theme) {
  try {
    const themeConfig = config[`${theme}Theme`];
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
    if (themeConfig) {
      document.documentElement.style.setProperty("--background-color", themeConfig.backgroundColor);
      document.documentElement.style.setProperty(
        "--background-image",
        `url("${path.join(basePath, themeConfig.backgroundImage).replace(/\\/g, "/")}")`
      );
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
      document.body.style.setProperty("--animated-background", config.animatedBackground || appTheme.backgroundColor);
    } else {
      document.body.classList.remove("animated-background");
    }
    document.documentElement.style.setProperty("--backdrop-blur", config.backdropBlur);
  } catch (error) {
    console.error("Error in applySettings:", error);
  }
}

module.exports = { applyTheme, applySettings };
