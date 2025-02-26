const fs = require('fs')
const path = require('path')
const { config } = require('./config')

// Load translations
const translations = require('../translations.json')

// Current language setting
let currentLanguage = config.language?.current || "ru"

/**
 * Updates all text elements according to the selected language
 */
function updateTexts() {
  try {
    const texts = translations[currentLanguage]
    if (!texts) return

    const screenTitles = {
      "loading-screen": texts.loadingScreenTitle,
      "splash-screen": texts.welcomeMessage,
      "style-screen": texts.styleScreenTitle,
      "gender-screen": texts.genderScreenTitle,
      "camera-screen": texts.cameraScreenTitle,
      "processing-screen": texts.processingScreenTitle,
      "result-screen": texts.resultScreenTitle,
    }

    for (const [screenId, titleText] of Object.entries(screenTitles)) {
      const screen = document.getElementById(screenId)
      if (screen) {
        const titleElement = screen.querySelector("h1")
        if (titleElement) {
          titleElement.textContent = titleText
        }
      }
    }

    // Update button texts
    const startButton = document.getElementById("start-button")
    if (startButton) {
      startButton.textContent = texts.startButtonText
    }

    const continueButton = document.getElementById("gender-continue")
    if (continueButton) {
      continueButton.textContent = texts.continueButtonText
    }

    const showResultQrBtn = document.getElementById("show-qr-button")
    if (showResultQrBtn) {
      showResultQrBtn.textContent = texts.showResultQrBtn
    }

    const backButtons = document.querySelectorAll(".back-button")
    backButtons.forEach((button) => {
      button.textContent = texts.backButtonText
    })

    const printPhotoButton = document.getElementById("print-photo")
    if (printPhotoButton) {
      printPhotoButton.textContent = texts.printButtonText
    }

    const startOverButton = document.getElementById("start-over")
    if (startOverButton) {
      startOverButton.textContent = texts.startOverButtonText
    }

    const loaderText = document.getElementsByClassName("loader-text")
    if (loaderText) {
      ;[...loaderText].forEach((el) => (el.textContent = texts.loaderText))
    }

    const genderButtons = document.querySelectorAll("#gender-buttons .button")
    genderButtons.forEach((button) => {
      const genderKey = button.getAttribute("data-gender")
      button.textContent = texts.genders[genderKey]
    })

    const languageSwitcher = document.getElementById("language-switcher")
    if (languageSwitcher) {
      languageSwitcher.textContent = currentLanguage === "ru" ? "KK" : "RU"
      languageSwitcher.style.display = config.language?.showSwitcher
        ? "block"
        : "none"
    }

    require('./imageProcessing').updatePrintButtonVisibility()
    window.loaderMessages = translations[currentLanguage].loaderMessages || []
    window.currentMessageIndex = 0
  } catch (error) {
    console.error("Error in updateTexts:", error)
  }
}

/**
 * Changes the current language
 * @param {string} language - Language code (e.g., 'ru', 'kz')
 */
function setLanguage(language) {
  try {
    currentLanguage = language
    config.language.current = language
    fs.writeFileSync(
      path.join(__dirname, "..", "config.json"),
      JSON.stringify(config, null, 2)
    )
    updateTexts()
  } catch (error) {
    console.error("Error in setLanguage:", error)
  }
}

/**
 * Gets the current active language
 * @returns {string} Current language code
 */
function getCurrentLanguage() {
  return currentLanguage
}

/**
 * Initializes language switcher button
 */
function initLanguageSwitcher() {
  const languageSwitcher = document.getElementById("language-switcher")
  if (languageSwitcher) {
    languageSwitcher.style.display = config.language?.showSwitcher
      ? "block"
      : "none"
    languageSwitcher.addEventListener("click", () => {
      setLanguage(currentLanguage === "ru" ? "kz" : "ru")
    })
  }
}

module.exports = {
  updateTexts,
  setLanguage,
  getCurrentLanguage,
  initLanguageSwitcher
}
