// scripts.js
const { ipcRenderer } = require("electron")
const fs = require("fs")
const path = require("path")
const { saveImageWithUtils } = require("./utils/saveUtils")
const QRCode = require("qrcode")
const sharp = require("sharp")

const { getState, setState } = require("./state")
const { initStyleButtons, fetchStyles } = require("./styleHandler")
const { initGenderButtons, setGenderImages } = require("./genderHandler")
const { startCamera, stopCamera, takePicture } = require("./camera")
const { startCountdown } = require("./countdown")
const { sendDateToServer } = require("./imageProcessor")
const { showScreen, updatePrintButtonVisibility } = require("./uiNavigation")
const { updateTexts } = require("./localization")
const { applyTheme, applySettings } = require("./theme")
const { resetInactivityTimer } = require("./inactivity")

// DOM элементы
const styleScreen = document.getElementById("style-screen")
const genderScreen = document.getElementById("gender-screen")
const cameraScreen = document.getElementById("camera-screen")
const processingScreen = document.getElementById("processing-screen")
const resultScreen = document.getElementById("result-screen")
const styleButtonsContainer = document.getElementById("style-buttons")
const countdownElement = document.getElementById("countdown")
const video = document.getElementById("video")
const canvas = document.getElementById("canvas")
const resultImage = document.getElementById("result-image")
const startOverButton = document.getElementById("start-over")
const printPhotoButton = document.getElementById("print-photo")
const backButtons = document.querySelectorAll(".back-button")
const startButton = document.getElementById("start-button")
const continueButton = document.getElementById("gender-continue")
const genderButtons = document.querySelectorAll("#gender-buttons .button-row_item")
const showResultQrBtn = document.getElementById("show-qr-button")
const qrCodeImage = document.getElementById("qr-code-img")
const languageSwitcher = document.getElementById("language-switcher")
const translations = require("./translations.json")

// Инициализация при загрузке DOM
document.addEventListener("DOMContentLoaded", () => {
  const { config } = getState()
  if (config.cameraMode !== "canon") {
    showScreen("splash-screen")
  }
  updateTexts(startButton, printPhotoButton) // Передаем DOM-элементы
  initGenderButtons(genderButtons, continueButton)
  setGenderImages()
  applyTheme(config.theme || "light")
  applySettings()
  resetInactivityTimer()
})

// Обработчики событий
startButton.addEventListener("click", () => {
  setState({ selectedGenders: [] })
  genderButtons.forEach((item) => item.classList.remove("selected"))
  showScreen("gender-screen")
})

startOverButton.addEventListener("click", () => {
  setState({ selectedStyle: "", videoStream: null, cameraInitialized: false })
  resultImage.src = ""
  stopCamera()
  showScreen("splash-screen")
})

printPhotoButton.addEventListener("click", async () => {
  const { config, currentLanguage } = getState()
  printPhotoButton.disabled = true
  printPhotoButton.textContent = translations[currentLanguage].printButtonTextWaiting
  setTimeout(() => {
    printPhotoButton.disabled = false
    printPhotoButton.textContent = translations[currentLanguage].printButtonText
  }, config?.HotFolder ? 2000 : 4000)

  if (resultImage && resultImage.src) {
    const imageData = resultImage.src
    const isLandscape = resultImage.width > resultImage.height
    if (config?.HotFolder) {
      await saveImageWithUtils("copyDirectory", imageData)
    } else {
      ipcRenderer.send("print-photo", { imageData, isLandscape })
    }
  } else {
    console.error("Нет фото для печати.")
  }
})

backButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const currentScreen = document.querySelector(".screen.active")
    switch (currentScreen.id) {
      case "style-screen":
        setState({ selectedGenders: [] })
        genderButtons.forEach((item) => item.classList.remove("selected"))
        showScreen("gender-screen")
        break
      case "gender-screen":
        setState({ selectedGenders: [] })
        genderButtons.forEach((item) => item.classList.remove("selected"))
        showScreen("splash-screen")
        break
      case "camera-screen":
        if (!button.disabled) {
          stopCamera()
          showScreen("style-screen")
        }
        break
    }
  })
})

languageSwitcher.addEventListener("click", () => {
  const { currentLanguage, config } = getState()
  const newLanguage = currentLanguage === "ru" ? "kz" : "ru"
  setState({ currentLanguage: newLanguage })
  config.language.current = newLanguage
  fs.writeFileSync(path.join(__dirname, "config.json"), JSON.stringify(config, null, 2))
  updateTexts(startButton, printPhotoButton) // Передаем DOM-элементы при смене языка
})

showResultQrBtn.addEventListener("click", () => {
  qrCodeImage.style.display = "initial"
})

// Передача коллбэков для управления экранами
const onProcessing = () => showScreen("processing-screen")
const onResult = () => showScreen("result-screen")

// Пример вызова takePicture с передачей управления экраном через imageProcessor
async function handleTakePicture() {
  await takePicture(onProcessing, onResult, resultImage)
}