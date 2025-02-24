// localization.js
const translations = require("./translations.json")
const { getState } = require("./state")

function updateTexts(startButton, printPhotoButton) {
  const { currentLanguage } = getState()
  const texts = translations[currentLanguage]
  if (!texts) return

  if (startButton) startButton.textContent = texts.startButtonText
  if (printPhotoButton) printPhotoButton.textContent = texts.printButtonText
}

module.exports = { updateTexts }