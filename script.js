// ================== SCRIPT.JS (HINTS) ================== //
// IMPORTS AND REQUIREMENTS
// DOM ELEMENTS
// CONFIGURATION AND STATE
// STYLE HANDLING MODULE
// GENDER HANDLING MODULE
// EVENT LISTENERS

//* ================ IMPORTS AND REQUIREMENTS ================
const { ipcRenderer } = require("electron")
const fs = require("fs")
const path = require("path")
const { loadConfig } = require("./utils/configLoader")
const {
  saveImageWithUtils,
  copyPhotoToDateFolder,
} = require("./utils/saveUtils")
const QRCode = require("qrcode")
const sharp = require("sharp")

// Import new modules
const uiNavigation = require('./modules/uiNavigation')
const cameraModule = require('./modules/camera')
const countdownModule = require('./modules/countdown')
const imageProcessing = require('./modules/imageProcessing')
const themeModule = require('./modules/theme')
const localization = require('./modules/localization')
const { config, basePath, basePathName, baseDir, stylesDir, 
        localhost, imagesFolder, hotHolder, canonPhotosPath, 
        printLogo, logo_scale, logo_pos_x, logo_pos_y } = require('./modules/config')

//* ================ DOM ELEMENTS ================
const styleScreen = document.getElementById("style-screen")
const genderScreen = document.getElementById("gender-screen")
const cameraScreen = document.getElementById("camera-screen")
const processingScreen = document.getElementById("processing-screen")
const resultScreen = document.getElementById("result-screen")

const resultTitle = resultScreen.querySelector("h1")
resultTitle.style.display = "none"

const styleButtonsContainer = document.getElementById("style-buttons")
const countdownElement = document.getElementById("countdown")
const video = document.getElementById("video")
const canvas = document.getElementById("canvas")
const resultImage = document.getElementById("result-image")
const startOverButton = document.getElementById("start-over")
const printPhotoButton = document.getElementById("print-photo")
const progressBar = document.getElementById("progress-bar")
const progressBarFill = document.getElementById("progress-bar-fill")
const progressPercentage = document.getElementById("progress-percentage")
const backButtons = document.querySelectorAll(".back-button")
const startText = document.querySelector(".start-text")
const languageSwitcher = document.getElementById("language-switcher")
const genderButtons = document.querySelectorAll(
  "#gender-buttons .button-row_item"
)

const modal = document.getElementById("qr-modal")
const showResultQrBtn = document.getElementById("show-qr-button")
const qrCodeAgree = document.getElementById("qr-code-agree")
const qrCodeImage = document.getElementById("qr-code-img")
const startButton = document.getElementById("start-button")
let continueButton = document.getElementById("gender-continue")
const brandLogo = document.getElementById("logo")

//* ================ CONFIGURATION AND STATE ================
let amountOfStyles = 0
let selectedStyle = ""
let nameDisplay = ""
let selectedGenders = []
let countdownInterval

// Make these variables available to other modules
window.amountOfStyles = amountOfStyles
window.selectedStyle = selectedStyle
window.nameDisplay = nameDisplay
window.selectedGenders = selectedGenders
window.countdownInterval = countdownInterval

// Handle logo paths correctly
if (config?.brandLogoPath) {
  brandLogo.src = config.brandLogoPath;
  brandLogo.style.transform = `scale(${config.mainLogoScale || 1})`;
  
  // Check if the file exists by requesting it
  fetch(`file://${config.brandLogoPath}`)
    .then(response => {
      if (!response.ok) {
        console.warn("Could not load brand logo:", config.brandLogoPath);
        brandLogo.style.display = 'none';
      }
    })
    .catch(err => {
      console.error("Failed to load brand logo:", err);
      brandLogo.style.display = 'none';
    });
} else {
  brandLogo.style.display = 'none';
}

document.body.classList.add(`rotation-${config.camera_rotation}`)
document.body.classList.add(`camera-${config.cameraMode}`)
document.body.classList.add(
  `brandLogo-${config.brandLogoPath ? "true" : "false"}`
)

config?.showResultQrBtn
  ? (showResultQrBtn.style.display = "block")
  : (showResultQrBtn.style.display = "none")

// Apply rotation styles for the camera
cameraModule.applyRotationStyles();

//* ================ STYLE HANDLING MODULE ================
// Initializes style buttons based on fetched data
function initStyleButtons(parsedStyles) {
  try {
    // Filter out duplicate styles based on style.originalName
    const uniqueStyles = parsedStyles.filter(
      (style, index, self) =>
        index === self.findIndex((s) => s.originalName === style.originalName)
    )
    console.log("▶️ Filtered styles: ", uniqueStyles)
    amountOfStyles = uniqueStyles.length
    window.amountOfStyles = amountOfStyles

    if (!styleButtonsContainer) {
      console.error("Element style-buttons not found.")
      return
    }
    styleButtonsContainer.innerHTML = ""

    if (amountOfStyles > 1) {
      uniqueStyles.forEach((style, index) => {
        const button = document.createElement("div")

        button.classList.add("button")
        button.setAttribute("data-style", style.originalName)

        const img = document.createElement("img")
        const sanitizedDisplayName = style.displayName
          .replace(/\s*\(.*?\)/g, "")
          .replace(/\s+/g, "_")
          .replace(/[^\w\-]+/g, "")

        let imagePath = null
        for (const gender of selectedGenders) {
          const styleFolderPath = path.join(
            stylesDir,
            gender,
            style.originalName
          )
          const imageFileNamePrefix = `1${sanitizedDisplayName}`
          const extensions = [".jpg", ".png", ".jpeg"]
          for (const ext of extensions) {
            const possiblePath = path.join(
              styleFolderPath,
              imageFileNamePrefix + ext
            )
            if (fs.existsSync(possiblePath)) {
              imagePath = possiblePath
              break
            }
          }
          if (imagePath) {
            break
          }
        }

        if (imagePath) {
          img.src = imagePath
        } else {
          console.error(`Image not found for style: ${style.originalName}`)
          // Default image
          img.src = `${stylesDir}/default.png`
        }
        img.alt = style.displayName
        const label = document.createElement("div")
        const match = style.displayName.match(/\(([^)]+)\)/)

        // Hide style names if configured
        if (config.showStyleNames) {
          label.textContent = match ? match[1] : style.displayName
        } else label.textContent = ""

        button.appendChild(img)
        button.appendChild(label)
        console.log(`Style button created: ${style}`)

        button.addEventListener("click", () => {
          selectedStyle = style.originalName.replace(/\s*\(.*?\)/g, "")
          nameDisplay = style.originalName
          
          // Update global variables
          window.selectedStyle = selectedStyle
          window.nameDisplay = nameDisplay

          if (fs.existsSync(printLogo)) {
            uiNavigation.showScreen("camera-screen")
            console.log(`▶️ Selected style: ${selectedStyle}`)
          } else {
            alert("Logo not found. Please add a logo.")
            uiNavigation.showScreen("style-screen")
          }
        })

        button.style.animationDelay = `${index * 0.3}s`
        styleButtonsContainer.appendChild(button)
      })
    } else if (amountOfStyles === 0) {
      alert(`No styles found for ${selectedGenders}`)
      uiNavigation.showScreen("gender-screen")
    } else {
      selectedStyle = uniqueStyles[0].originalName.replace(/\s*\(.*?\)/g, "")
      nameDisplay = uniqueStyles[0].originalName
      
      // Update global variables
      window.selectedStyle = selectedStyle
      window.nameDisplay = nameDisplay

      uiNavigation.showScreen("camera-screen")
      console.log(`Style selected: ${selectedStyle}`)
    }
  } catch (error) {
    console.error("Error in initStyleButtons:", error)
  }
}

// Requests available styles from the server
function fetchStyles() {
  try {
    ipcRenderer
      .invoke("get-styles", selectedGenders)
      .then((styles) => {
        console.log("Styles received:", styles)
        initStyleButtons(styles)
      })
      .catch((error) => {
        console.error("Error loading styles:", error)
        alert("Failed to load styles. Try again later.")
      })
  } catch (error) {
    console.error("Error in fetchStyles:", error)
  }
}

//* ================ GENDER HANDLING MODULE ================
// Initializes gender selection buttons and their handlers
function initGenderButtons() {
  try {
    continueButton.disabled = true
    continueButton.style.display = config.allowMultipleGenderSelection
      ? "block"
      : "none"

    genderButtons.forEach((item, index) => {
      item.style.animationDelay = `${index * 0.3}s`
      item.classList.add("animate")
      // Remove old event listeners
      item.replaceAllListeners?.("click")

      item.addEventListener("click", () => {
        const button = item.querySelector(".button")
        const gender = button.getAttribute("data-gender")

        if (config.allowMultipleGenderSelection) {
          const index = selectedGenders.indexOf(gender)
          if (index === -1) {
            selectedGenders.push(gender)
            item.classList.add("selected")
            continueButton.disabled = false
          } else {
            selectedGenders.splice(index, 1)
            item.classList.remove("selected")
          }
          if (selectedGenders.length < 1) {
            continueButton.disabled = true
          }

          // Update global variable
          window.selectedGenders = selectedGenders
          console.log("▶️ Selected gender(s): ", selectedGenders)
        } else {
          // Single selection mode
          genderButtons.forEach((btn) => btn.classList.remove("selected"))
          selectedGenders = [gender]
          window.selectedGenders = selectedGenders
          console.log("▶️ Selected gender: " + selectedGenders[0])
          uiNavigation.showScreen("style-screen")
          fetchStyles()
        }
      })
    })

    continueButton.addEventListener("click", () => {
      if (selectedGenders.length > 0) {
        uiNavigation.showScreen("style-screen")
        fetchStyles()
      }
    })
  } catch (error) {
    console.error("Error in initGenderButtons:", error)
  }
}

// Sets images for gender selection buttons
function setGenderImages() {
  try {
    const allowedGenders = config.allowedGenders || [
      "man",
      "woman",
      "boy",
      "girl",
      "group",
    ]
    const arrGenders = flattenGenders(allowedGenders)
    arrGenders.forEach((gender) => {
      const imgElement = document.getElementById(`gender-${gender}`)
      if (imgElement) {
        imgElement.src = `./gender/${gender}.png`
      }
    })
    const allGenders = ["man", "woman", "boy", "girl", "group"]
    allGenders.forEach((gender) => {
      if (!arrGenders.includes(gender)) {
        const buttonElement = document.querySelector(
          `.button[data-gender="${gender}"]`
        )
        if (buttonElement && buttonElement.parentElement) {
          buttonElement.parentElement.style.display = "none"
        }
      }
    })
  } catch (error) {
    console.error("Error in setGenderImages:", error)
  }
}

// Flattens array of allowed genders
function flattenGenders(allowedGenders) {
  const genders = []
  const flatten = (item) => {
    if (Array.isArray(item)) {
      item.forEach(flatten)
    } else if (typeof item === "string") {
      item.split(" ").forEach((g) => genders.push(g))
    }
  }
  allowedGenders.forEach(flatten)
  return [...new Set(genders)]
}

//* ================ PRINTING MODULE ================
if (startOverButton) {
  startOverButton.addEventListener("click", () => {
    selectedStyle = ""
    window.selectedStyle = ""
    resultImage.src = ""
    cameraModule.stopCamera()
    uiNavigation.showScreen("splash-screen")
    qrCodeImage.style.display = "none"
    qrCodeAgree.style.display = "initial"
  })
}

if (printPhotoButton) {
  printPhotoButton.addEventListener("click", async () => {
    const translations = require("./translations.json")
    const currentLanguage = localization.getCurrentLanguage()
    
    printPhotoButton.disabled = true
    printPhotoButton.textContent =
      translations[currentLanguage].printButtonTextWaiting
    setTimeout(
      () => {
        printPhotoButton.disabled = false
        printPhotoButton.textContent =
          translations[currentLanguage].printButtonText
      },
      hotHolder ? 2000 : 4000
    )

    if (resultImage && resultImage.src) {
      const imageData = resultImage.src
      const isLandscape = resultImage.width > resultImage.height
      if (hotHolder) {
        await saveImageWithUtils("copyDirectory", imageData)
      } else {
        console.log(
          `isLandscape: ${isLandscape}: ${resultImage.width}x${resultImage.height}`
        )

        ipcRenderer.send("print-photo", {
          imageData: imageData,
          isLandscape,
        })
      }
    } else {
      console.error("No photo to print.")
    }
  })
}

ipcRenderer.on("print-photo-response", (event, success) => {
  if (success) {
    console.log("▶️ Print completed successfully.")
  } else {
    console.error("Print error.")
  }
})

//* ================ INACTIVITY HANDLER MODULE ================
// Resets inactivity timer
const inactivityTimeout = config.inactivityTimeout || 60000
let inactivityTimer
function resetInactivityTimer() {
  try {
    clearTimeout(inactivityTimer)
    inactivityTimer = setTimeout(() => {
      uiNavigation.showScreen("splash-screen")
      selectedStyle = ""
      window.selectedStyle = ""
      resultImage.src = ""
      cameraModule.stopCamera()
    }, inactivityTimeout)
  } catch (error) {
    console.error("Error in resetInactivityTimer:", error)
  }
}

// Set up event listeners for inactivity timer
;["click", "mousemove", "keypress", "touchstart"].forEach((event) => {
  document.addEventListener(event, resetInactivityTimer)
})
resetInactivityTimer()

//* ================ EVENT LISTENERS ================
document.addEventListener("DOMContentLoaded", () => {
  if (config.cameraMode !== "canon") {
    uiNavigation.showScreen("splash-screen")
  }

  localization.updateTexts()
  initGenderButtons()
  setGenderImages()
  uiNavigation.initBackButtons()
  uiNavigation.initModal()
  uiNavigation.initNavigationEvents() // Add this line
  themeModule.applyTheme(config.theme || "light")
  themeModule.applySettings()
})

// Custom document events
document.addEventListener('reset-state', () => {
  selectedStyle = ""
  window.selectedStyle = ""
  selectedGenders = []
  window.selectedGenders = []
  resultImage.src = ""
})

document.addEventListener('reset-gender-selection', () => {
  selectedGenders = []
  window.selectedGenders = []
  genderButtons.forEach((item) => {
    item.classList.remove("selected")
  })
})

document.addEventListener('stop-countdown', () => {
  countdownModule.stopCountdown()
})

// Initialize window resize handler
window.addEventListener("resize", uiNavigation.handleOrientationChange)

// Agreement checkbox handling
const agreementCheckbox = document.getElementById("agreement-checkbox")

if (startButton && agreementCheckbox) {
  startButton.disabled = !agreementCheckbox.checked

  agreementCheckbox.addEventListener("change", () => {
    startButton.disabled = !agreementCheckbox.checked
  })
}

if (!config.visibilityAgree) {
  startText.remove()
}

if (startButton) {
  startButton.addEventListener("click", () => {
    uiNavigation.showScreen("gender-screen")
    selectedGenders = []
    window.selectedGenders = []
    genderButtons.forEach((item) => {
      item.classList.remove("selected")
    })
  })
}

// Language switcher setup
if (languageSwitcher) {
  localization.initLanguageSwitcher()
}

// Fullscreen toggle setup
const fullscreenToggleButton = document.getElementById("fullscreen-toggle")
let clickCount = 0
let clickTimer
fullscreenToggleButton.addEventListener("click", function () {
  clickCount++
  if (clickCount === 3) {
    clickCount = 0
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Full-screen error: ${err.message}`)
      })
      clearTimeout(clickTimer)
    } else {
      document.exitFullscreen()
      clearTimeout(clickTimer)
    }
  }
  if (!clickTimer) {
    clickTimer = setTimeout(() => {
      clickCount = 0
    }, 500)
  } else {
    clearTimeout(clickTimer)
    clickTimer = setTimeout(() => {
      clickCount = 0
    }, 500)
  }
})

// Process animation code
const translations = require("./translations.json")
let loaderMessages = translations[localization.getCurrentLanguage()].loaderMessages || []
let currentMessageIndex = 0

// Creates animated text during processing
function createFloatingText(message) {
  const textElement = document.createElement("div")
  const progressBarRect = progressBar.getBoundingClientRect()
  textElement.className = "floating-text"
  textElement.innerText = message

  const randomX = Math.random() * 35 + 25
  const xPosition = (progressBarRect.width * randomX) / 100
  const randomY = Math.random() * 40 - 20

  textElement.style.position = "absolute"
  textElement.style.left = `${progressBarRect.left / 1.2 + xPosition}px`
  textElement.style.bottom = `${
    progressBarRect.bottom + randomY - window.innerHeight
  }px`

  processingScreen.appendChild(textElement)

  setTimeout(() => {
    processingScreen.removeChild(textElement)
  }, 2000)
}

// Shows next message during processing
function displayNextMessage() {
  if (processingScreen.classList.contains("active")) {
    if (loaderMessages.length > 0) {
      createFloatingText(loaderMessages[currentMessageIndex])
      currentMessageIndex = (currentMessageIndex + 1) % loaderMessages.length
    }
  }
}
setInterval(displayNextMessage, 2000)

// QR code display
showResultQrBtn.addEventListener("click", () => {
  qrCodeAgree.style.display = "none"
  qrCodeImage.style.display = "initial"
  uiNavigation.showModal()
})

// Canon camera event handler
ipcRenderer.on("camera-control-status", (event, isRunning) => {
  console.log("CameraControl.exe status:", isRunning)
  window.cameraControlActive = isRunning
  if (isRunning) {
    setTimeout(async () => {
      if (config.cameraMode === "canon") {
        try {
          console.log("Checking Canon live view...")
          const response = await fetch(`${localhost}/api/get/live-view`)
          if (!response.ok) {
            throw new Error("Canon live view not active.")
          }
          console.log("▶️ Canon live view active.")
          document.getElementById("liveViewImage").style.display = "block"
          uiNavigation.showScreen("splash-screen")
          // Initialize liveView monitoring
          cameraModule.monitorLiveView()
        } catch (error) {
          console.error("Error in Canon mode:", error)
          console.log("Attempting to restart Canon live view...")
          await cameraModule.startLiveView()
          setTimeout(async () => {
            try {
              console.log("Checking Canon live view after restart...")
              const checkResponse = await fetch(
                `${localhost}/api/get/live-view`
              )
              if (!checkResponse.ok) {
                throw new Error("Canon live view not active after restart.")
              }
              console.log("▶️ Canon live view restarted successfully.")
              document.getElementById("liveViewImage").style.display = "block"
              uiNavigation.showScreen("splash-screen")
              // Initialize liveView monitoring
              cameraModule.monitorLiveView()
            } catch (err) {
              console.error("Canon live view still not active:", err)
              alert(
                "Canon camera did not start. Check connection or use another mode."
              )
              // Optionally fallback to PC camera:
              // await cameraModule.startCamera();
              uiNavigation.showScreen("splash-screen")
              console.warn("Switching to PC camera...")
              cameraModule.cameraMode = "pc"
            }
          }, 2000)
        }
      } else {
        uiNavigation.showScreen("splash-screen")
      }
    }, 3000)
  }
})

// Custom event handlers to fix circular dependencies between modules
document.addEventListener('show-screen', (event) => {
  if (event.detail) {
    uiNavigation.showScreen(event.detail);
  }
});

document.addEventListener('start-countdown', () => {
  countdownModule.startCountdown();
});
