const { config } = require('./config')
const camera = require('./camera')

// Track screen states
let currentScreen = null

/**
 * Switches visibility of screens in the application
 * @param {string} screenId - ID of the screen to show
 */
async function showScreen(screenId) {
  try {
    console.log(`➩ Switching to screen: ${screenId}`)

    const currentActive = document.querySelector(".screen.active")
    if (currentActive) {
      currentActive.classList.remove("active")
    }

    const targetScreen = document.getElementById(screenId)
    if (targetScreen) {
      targetScreen.classList.add("active")
      currentScreen = screenId

      if (screenId === "style-screen") {
        const styleButtonsContainer = document.getElementById("style-buttons")
        styleButtonsContainer.classList.add("hide-scrollbar")
        setTimeout(() => {
          styleButtonsContainer.classList.remove("hide-scrollbar")
        }, 4000)
        if (styleButtonsContainer) {
          styleButtonsContainer.scrollTop = 0
        }
      }

      if (screenId === "splash-screen") {
        // Reset state
        document.dispatchEvent(new CustomEvent('reset-state'))
        camera.stopCamera()
        const modal = document.getElementById("qr-modal")
        const qrCodeImage = document.getElementById("qr-code-img")
        const qrCodeAgree = document.getElementById("qr-code-agree")
        modal.style.display = "none"
        qrCodeImage.style.display = "none"
        qrCodeAgree.style.display = "initial"
      }

      const backButton = targetScreen.querySelector(".back-button")
      if (backButton) {
        if (screenId === "splash-screen" || screenId === "processing-screen") {
          backButton.disabled = true
          backButton.style.display = "block"
        } else if (screenId === "result-screen") {
          backButton.style.display = "none"
        } else {
          backButton.disabled = false
          backButton.style.display = "block"
        }
      }

      if (screenId === "result-screen") {
        const resultTitle = document.getElementById("result-screen").querySelector("h1")
        resultTitle.style.display = "block"
      } else {
        const resultTitle = document.getElementById("result-screen").querySelector("h1")
        resultTitle.style.display = "none"
      }

      if (screenId === "camera-screen") {
        await camera.initCamera()
      }
    } else {
      console.error(`Screen with ID "${screenId}" not found.`)
    }

    // Handle logo visibility
    const logoContainer = document.getElementById("logo-container")
    if (screenId === "camera-screen" || screenId === "result-screen") {
      logoContainer.style.display = "none"
    } else {
      if (config.brandLogoPath) {
        logoContainer.style.display = "block"
      }
    }
  } catch (error) {
    console.error(`Error in showScreen (${screenId}):`, error)
  }
}

/**
 * Handles orientation changes
 */
function handleOrientationChange() {
  try {
    if (window.innerHeight > window.innerWidth) {
      console.log("Portrait orientation")
    } else {
      console.log("Landscape orientation")
    }
  } catch (error) {
    console.error("Error in handleOrientationChange:", error)
  }
}

// Initialize back buttons
function initBackButtons() {
  const backButtons = document.querySelectorAll(".back-button")
  backButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const currentScreen = document.querySelector(".screen.active")
      
      switch (currentScreen.id) {
        case "style-screen":
          document.dispatchEvent(new CustomEvent('reset-gender-selection'))
          showScreen("gender-screen")
          break
        case "gender-screen":
          document.dispatchEvent(new CustomEvent('reset-gender-selection'))
          showScreen("splash-screen")
          break
        case "camera-screen":
          if (!button.disabled && window.amountOfStyles > 1) {
            document.dispatchEvent(new CustomEvent('stop-countdown'))
            camera.stopCamera()
            showScreen("style-screen")
          } else if (window.amountOfStyles === 1) {
            document.dispatchEvent(new CustomEvent('reset-gender-selection'))
            showScreen("gender-screen")
          }
          break
      }
    })
  })
}

// Modal functions
function showModal() {
  const modal = document.getElementById("qr-modal")
  if (modal) {
    modal.style.display = "flex"
  }
}

function initModal() {
  const modal = document.getElementById("qr-modal")
  if (modal) {
    modal.addEventListener("click", function (event) {
      if (
        event.target === modal ||
        event.target.classList.contains("close-modal")
      ) {
        modal.style.display = "none"
      }
    })
  }
  
  const customCheckboxQr = document.querySelector(".custom-checkbox-qr")
  if (customCheckboxQr) {
    customCheckboxQr.addEventListener("click", function (event) {
      const qrCodeImage = document.getElementById("qr-code-img")
      qrCodeImage.style.display = "none"
      showModal()
    })
  }
  
  const showResultQrBtn = document.getElementById("show-qr-button")
  showResultQrBtn.addEventListener("click", () => {
    const qrCodeAgree = document.getElementById("qr-code-agree")
    const qrCodeImage = document.getElementById("qr-code-img")
    qrCodeAgree.style.display = "none"
    qrCodeImage.style.display = "initial"
    showModal()
  })
}

/**
 * Initialize event listeners for navigation
 */
function initNavigationEvents() {
  document.addEventListener('show-screen', (event) => {
    if (event.detail) {
      showScreen(event.detail);
    }
  });
}

module.exports = {
  showScreen,
  handleOrientationChange,
  initBackButtons,
  showModal,
  initModal,
  initNavigationEvents
}
