const { ipcRenderer } = require("electron")
const fs = require("fs")
const path = require("path")
const { loadConfig } = require("./utils/configLoader")
const { saveImageWithUtils } = require("./utils/utils")

// DOM Elements
const styleScreen = document.getElementById("style-screen")
const genderScreen = document.getElementById("gender-screen")
const cameraScreen = document.getElementById("camera-screen")
const processingScreen = document.getElementById("processing-screen")
const resultScreen = document.getElementById("result-screen")

const resultTitle = resultScreen.querySelector("h1")
resultTitle.style.display = "none"

const styleButtonsContainer = document.getElementById("style-buttons")
const genderButtons = document.querySelectorAll("#gender-buttons .button")
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

let selectedStyle = ""
let selectedGender = ""
let nameDisplay = ""
let videoStream = null
let cameraInitialized = false
let resultShowStyle = ""
let hasBrackets = false

const config = loadConfig()
const translations = require("./translations.json")
const basePath = config.basePath
const baseDir = path.join(basePath, "SavedPhotos")
const stylesDir = config.stylesDir.replace("{{basePath}}", basePath)

document.getElementById("logo").src = config?.brandLogoPath
document.getElementById(
  "logo"
).style.transform = `scale(${config.mainLogoScale})`
document.body.classList.add(`rotation-${config.camera_rotation}`)

function applyRotationStyles() {
  try {
    const videoElement = document.getElementById("video")
    const resultImage = document.getElementById("result-image")
    if (videoElement) {
      videoElement.style.transform = `rotate(${config.camera_rotation}deg)`
      console.log(`Camera rotation set to ${config.camera_rotation} degrees.`)
    }
    if (resultImage) {
      resultImage.style.transform = `rotate(${config.final_image_rotation}deg)`
      console.log(
        `Final image rotation set to ${config.final_image_rotation} degrees.`
      )
    }
  } catch (error) {
    console.error("Error in applyRotationStyles:", error)
  }
}
applyRotationStyles()

function initStyleButtons(parsedStyles) {
  try {
    if (!styleButtonsContainer) {
      console.error("Element style-buttons not found.")
      return
    }
    styleButtonsContainer.innerHTML = ""

    parsedStyles.forEach((style, index) => {
      const button = document.createElement("div")
      button.classList.add("button")
      button.setAttribute("data-style", style.originalName)

      const img = document.createElement("img")
      const sanitizedDisplayName = style.displayName
        .replace(/\s*\(.*?\)/g, "")
        .replace(/\s+/g, "_")
        .replace(/[^\w\-]+/g, "")
      const styleFolderPath = path.join(
        stylesDir,
        selectedGender,
        style.originalName
      )
      const imageFileNamePrefix = `1${sanitizedDisplayName}`
      const extensions = [".jpg", ".png", ".jpeg"]
      let imagePath = null

      for (const ext of extensions) {
        const potentialPath = `${styleFolderPath}\\${imageFileNamePrefix}${ext}`
        if (fs.existsSync(potentialPath)) {
          imagePath = potentialPath
          break
        }
      }

      if (imagePath) {
        img.src = imagePath
      } else {
        console.error(`Image not found for style: ${style.originalName}`)
        // Можно установить изображение по умолчанию, если файл не найден
        img.src = `${stylesDir}/default.png`
      }
      img.alt = style.displayName
      const label = document.createElement("div")
      const match = style.displayName.match(/\(([^)]+)\)/)

      // Скрыть названия стилей
      if (config.showStyleNames) {
        label.textContent = ""
      } else label.textContent = match ? match[1] : style.displayName

      button.appendChild(img)
      button.appendChild(label)
      console.log(`Style button created: ${style}`)

      button.addEventListener("click", () => {
        selectedStyle = style.originalName.replace(/\s*\(.*?\)/g, "")
        nameDisplay = style.originalName
        hasBrackets = /\(.*?\)/.test(style.originalName)
        if (hasBrackets) {
          resultShowStyle = style.originalName.match(/\((.*?)\)/)
        }
        showScreen("camera-screen")
        console.log(`Style selected: ${selectedStyle}`)
        // Изменено с gender-screen на camera-screen
      })

      button.style.animationDelay = `${index * 0.3}s`
      styleButtonsContainer.appendChild(button)
    })
  } catch (error) {
    console.error("Error in initStyleButtons:", error)
  }
}

const genderItems = document.querySelectorAll(".button-row_item")
genderItems.forEach((item) => {
  item.addEventListener("click", () => {
    const button = item.querySelector(".button")
    selectedGender = button.getAttribute("data-gender") // Сохраняем выбранный пол
    console.log(`Gender selected: ${selectedGender}`)
    showScreen("style-screen")
    fetchStyles() // Загружаем стили после выбора гендера
  })
})

// Функция для получения доступных стилей
function fetchStyles() {
  try {
    ipcRenderer
      .invoke("get-styles", selectedGender)
      .then((styles) => {
        console.log("Получены стили:", styles)
        initStyleButtons(styles)
      })
      .catch((error) => {
        console.error("Ошибка при загрузке стилей:", error)
        alert("Не удалось загрузить стили. Попробуйте позже.")
      })
  } catch (error) {
    console.error("Ошибка в fetchStyles:", error)
  }
}

function initGenderButtons() {
  try {
    const genderButtons = document.querySelectorAll(
      "#gender-buttons .button-row_item"
    )
    genderButtons.forEach((button, index) => {
      button.style.animationDelay = `${index * 0.3}s`
      button.classList.add("animate")
    })
  } catch (error) {
    console.error("Error in initGenderButtons:", error)
  }
}

function showScreen(screenId) {
  try {
    console.log(`Switching to screen: ${screenId}`)
    const currentActive = document.querySelector(".screen.active")
    if (currentActive) {
      currentActive.classList.remove("active")
    }

    const targetScreen = document.getElementById(screenId)
    if (targetScreen) {
      targetScreen.classList.add("active")
      if (screenId === "style-screen") {
        styleButtonsContainer.classList.add("hide-scrollbar")
        setTimeout(() => {
          styleButtonsContainer.classList.remove("hide-scrollbar")
        }, 2500)
        const styleButtons = document.getElementById("style-buttons")
        if (styleButtons) {
          styleButtons.scrollTop = 0
        }
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
        resultTitle.style.display = "block"
      } else {
        resultTitle.style.display = "none"
      }

      if (screenId === "camera-screen") {
        // Запускаем камеру при отображении экрана camera-screen
        startCamera()
          .then(() => {
            // Начинаем обратный отсчет после инициализации камеры
            startCountdown()
          })
          .catch((err) => {
            alert("Unable to access the webcam.")
            showScreen("style-screen")
          })
      }
    } else {
      console.error(`Screen with ID "${screenId}" not found.`)
    }

    if (screenId !== "camera-screen" && countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
      countdownElement.textContent = ""
    }

    const logoContainer = document.getElementById("logo-container")
    if (screenId === "camera-screen" || screenId === "result-screen") {
      logoContainer.style.display = "none"
    } else {
      logoContainer.style.display = "block"
    }
  } catch (error) {
    console.error(`Error in showScreen (${screenId}):`, error)
  }
}

const resolutions = [
  { width: 1920, height: 1280 },
  { width: 1080, height: 720 },
  { width: 640, height: 480 },
]

async function findBestResolution() {
  try {
    for (let resolution of resolutions) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { exact: resolution.width },
            height: { exact: resolution.height },
          },
        })
        stream.getTracks().forEach((track) => track.stop())
        return resolution
      } catch {}
    }
    throw new Error("No supported resolutions found.")
  } catch (error) {
    console.error("Error in findBestResolution:", error)
    throw error
  }
}

async function startCamera() {
  try {
    const videoContainer = document.querySelector(".video-container")
    const cameraBackButton = document.querySelector(
      "#camera-screen .back-button"
    )
    cameraBackButton.disabled = true
    try {
      videoContainer.classList.add("loading")
      const bestResolution = await findBestResolution()
      console.log(
        `Using resolution: ${bestResolution.width}x${bestResolution.height}`
      )

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: bestResolution.width,
          height: bestResolution.height,
        },
      })
      videoStream = stream
      video.srcObject = stream

      await Promise.race([
        new Promise((resolve) => {
          video.onloadedmetadata = () => {
            cameraInitialized = true
            console.log("Camera metadata loaded successfully")
            resolve()
          }
        }),
        new Promise((_, reject) =>
          setTimeout(() => {
            reject(new Error("Camera initialization timed out"))
          }, 3000) // Timeout in milliseconds
        ),
      ])

      videoContainer.classList.remove("loading")
      console.log("Camera started successfully")
    } catch (error) {
      console.error("Camera initialization failed:", error)
      videoContainer.classList.remove("loading")
      throw error
    } finally {
      cameraBackButton.disabled = false
    }
  } catch (error) {
    console.error("Error in startCamera:", error)
    throw error
  }
}

function stopCamera() {
  try {
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop())
      video.srcObject = null
      videoStream = null
      cameraInitialized = false
      console.log("Camera stopped")
    }
  } catch (error) {
    console.error("Error in stopCamera:", error)
  }
}

function startCountdown() {
  try {
    if (!cameraInitialized) {
      console.log("Camera not ready, waiting for initialization...")
      // Ждем события onloadedmetadata, если камера еще не готова
      video.onloadedmetadata = () => {
        cameraInitialized = true
        console.log("Camera initialized, starting countdown")
        beginCountdown()
      }
    } else {
      beginCountdown()
    }
  } catch (error) {
    console.error("Error in startCountdown:", error)
  }
}

let countdownInterval

function beginCountdown() {
  try {
    let countdown = config.prePhotoTimer || 5
    const backButton = document.querySelector("#camera-screen .back-button")
    countdownElement.textContent = countdown
    countdownInterval = setInterval(() => {
      countdown--
      if (countdown > 0) {
        countdownElement.textContent = countdown
        backButton.style.opacity = "1"
        if (countdown <= 2 && backButton) {
          backButton.disabled = true
          backButton.style.opacity = "0.5"
        }
      } else {
        clearInterval(countdownInterval)
        countdownElement.textContent = ""
        takePicture()
      }
    }, 1000)
  } catch (error) {
    console.error("Error in beginCountdown:", error)
  }
}

function takePicture() {
  try {
    const context = canvas.getContext("2d")
    const rotationAngle = config.send_image_rotation || 0
    if (rotationAngle === 90 || rotationAngle === 270) {
      canvas.width = video.videoHeight
      canvas.height = video.videoWidth
    } else {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
    }

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.save()
    context.translate(canvas.width / 2, canvas.height / 2)
    context.rotate((rotationAngle * Math.PI) / 180)
    if (rotationAngle === 90 || rotationAngle === 270) {
      context.drawImage(
        video,
        -video.videoWidth / 2,
        -video.videoHeight / 2,
        video.videoWidth,
        video.videoHeight
      )
    } else {
      context.drawImage(
        video,
        -canvas.width / 2,
        -canvas.height / 2,
        canvas.width,
        canvas.height
      )
    }
    context.restore()
    stopCamera()

    const imageData = canvas.toDataURL("image/jpeg", 1.0)
    console.log("Picture taken successfully")

    try {
      saveImageWithUtils("input", imageData)
      console.log("Input image saved successfully")
    } catch (error) {
      console.error("Failed to save input image:", error)
    }

    sendImageToServer(imageData)
  } catch (error) {
    console.error("Error in takePicture:", error)
    alert("Failed to take picture.")
    showScreen("style-screen")
  }
}

function sendImageToServer(imageData) {
  try {
    console.log("sending image to server")
    showScreen("processing-screen")
    const base64Image = imageData.split(",")[1]
    const fonImage = getRandomImageFromStyleFolder(nameDisplay)
    const base64FonImage = fonImage ? fonImage.split(",")[1] : base64Image

    const data = {
      mode: `${config?.mode}` || "Avatar",
      style: selectedStyle,
      params: {
        Sex: selectedGender,
        Face: base64Image,
        Fon: base64FonImage,
      },
    }

    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${config?.authToken}`,
      "Content-Type": "application/json",
    }

    const fetchOptions = {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data),
    }

    const logFilePath = path.join(basePath, "request_log.txt")
    fs.writeFileSync(
      logFilePath,
      `Headers: ${JSON.stringify(headers, null, 2)}\nData: ${JSON.stringify(
        data,
        null,
        2
      )}`,
      "utf-8"
    )
    console.log("request log saved to:", logFilePath)

    progressBar.style.display = "block"
    progressBarFill.style.width = "0%"
    progressPercentage.textContent = "0%"

    let progress = 0
    const progressInterval = setInterval(() => {
      if (progress >= 100) {
        clearInterval(progressInterval)
      } else {
        progress += 10
        updateProgressBar(progress)
      }
    }, 1100)

    fetch("http://90.156.158.209/api/handler/", fetchOptions)
      .then((response) => {
        console.log("HTTP response status:", response.status)
        if (!response.ok) throw new Error("Network error: " + response.status)
        return response.json()
      })
      .then((responseData) => {
        console.log("Data received from server:", responseData)
        clearInterval(progressInterval)
        handleServerResponse(responseData)
      })
      .catch(() => {
        fetch("http://85.95.186.114/api/handler/", fetchOptions)
          .then((response) => {
            if (!response.ok)
              throw new Error("Network error: " + response.status)
            return response.json()
          })
          .then((responseData) => {
            clearInterval(progressInterval)
            handleServerResponse(responseData)
          })
          .catch((error) => {
            console.error("Error sending data to backup server:", error)
            clearInterval(progressInterval)
            alert("Error sending the image to the server.")
            showScreen("style-screen")
          })
      })
  } catch (error) {
    console.error("Error in sendImageToServer:", error)
  }
}

async function handleServerResponse(responseData) {
  try {
    const imagesArray = Object.values(responseData)[0]
    if (imagesArray && imagesArray.length > 0) {
      const base64Image = imagesArray[0].replace(/[\n\r"']/g, "").trim()
      const finalImageWithLogo = await overlayLogoOnImage(base64Image)
      resultImage.src = finalImageWithLogo
      // const selectedParamsText = document.getElementById("selected-params-text");
      // const texts = translations[currentLanguage];

      // if (selectedParamsText && texts) {
      //   const genderText = texts.genders[selectedGender] || selectedGender;
      //   let styleText = "";
      //   if (!hasBrackets) {
      //     styleText =
      //       document.querySelector(`[data-style="${selectedStyle}"]`)?.querySelector("div")?.textContent || selectedStyle;
      //   } else {
      //     styleText = resultShowStyle[1];
      //   }
      //   selectedParamsText.innerHTML = `${texts.genderScreenTitleEnd}:  <strong>${genderText}</strong><br/>${texts.styleScreenTitleEnd}:  <strong>${styleText}</strong>`;
      // }

      saveImageWithUtils("output", finalImageWithLogo)

      resultImage.onload = () => {
        console.log("Image loaded successfully")
        console.log(
          "Image dimensions: ",
          resultImage.width,
          "x",
          resultImage.height
        )

        showScreen("result-screen")
        updatePrintButtonVisibility()
      }
    } else {
      alert("Failed to retrieve processed image.")
      showScreen("style-screen")
    }
  } catch (error) {
    console.error("Error in handleServerResponse:", error)
  }
}

function updatePrintButtonVisibility() {
  if (config.printButtonVisible) {
    printPhotoButton.style.display = "block"
  } else {
    printPhotoButton.style.display = "none"
  }
}

async function overlayLogoOnImage(base64Image) {
  try {
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")
    const mainImage = new Image()
    const logoImage = new Image()

    mainImage.src = `data:image/jpeg;base64,${base64Image}`
    logoImage.src = config.logoPath

    await Promise.all([
      new Promise((resolve, reject) => {
        mainImage.onload = resolve
        mainImage.onerror = reject
      }),
      new Promise((resolve, reject) => {
        logoImage.onload = resolve
        logoImage.onerror = reject
      }),
    ])

    canvas.width = mainImage.width
    canvas.height = mainImage.height
    context.drawImage(mainImage, 0, 0)

    let x = 0
    let y = 0
    const offsetX = config.logoOffsetX || 30
    const offsetY = config.logoOffsetY || 30
    const scaleFactor = config.logoScale || 1
    const logoWidth = logoImage.width * scaleFactor
    const logoHeight = logoImage.height * scaleFactor

    switch (config.logoPosition) {
      case "top-left":
        x = offsetX
        y = offsetY
        break
      case "top-right":
        x = canvas.width - logoWidth - offsetX
        y = offsetY
        break
      case "bottom-left":
        x = offsetX
        y = canvas.height - logoHeight - offsetY
        break
      case "center":
        x = (canvas.width - logoImage.width) / 2
        y = (canvas.height - logoImage.height) / 2
        break
      case "center-top":
        x = (canvas.width - logoImage.width) / 2
        y = offsetY
        break
      case "center-bottom":
        x = (canvas.width - logoImage.width) / 2
        y = canvas.height - logoImage.height - offsetY
        break
      case "bottom-right":
      default:
        x = canvas.width - logoWidth - offsetX
        y = canvas.height - logoHeight - offsetY
    }

    context.drawImage(logoImage, x, y, logoWidth, logoHeight)
    return canvas.toDataURL("image/jpeg", 1.0)
  } catch (error) {
    console.error("Error in overlayLogoOnImage:", error)
    return null
  }
}

function getRandomImageFromStyleFolder(style) {
  try {
    const styleFolderPath = path.join(stylesDir, selectedGender, style)

    if (!fs.existsSync(styleFolderPath)) {
      console.warn(
        `\x1b[41m[Warning]\x1b[0m Folder for style "${style}" and gender "${selectedGender}" does not exist.`
      )
      return null
    }

    console.log(`[Info] Reading folder: ${styleFolderPath}`)

    // Очистка стиля (удаляем содержимое скобок)
    const cleanedStyle = style.replace(/\s*\(.*?\)/g, "").toLowerCase() // Убираем пробелы и содержимое в скобках
    const excludeList = [
      `1${cleanedStyle}.jpg`,
      `1${cleanedStyle}.jpeg`,
      `1${cleanedStyle}.png`,
    ]

    const files = fs
      .readdirSync(styleFolderPath)
      .filter((file) => /\.(jpg|jpeg|png)$/i.test(file)) // Оставляем только изображения
      .filter((file) => {
        const isExcluded = excludeList.includes(file.toLowerCase())
        // Раскомментировать для отладки
        // console.log(
        //   `Checking exclusion: ${file}, Exclude List: ${excludeList}, Excluded: ${isExcluded}`
        // )
        return !isExcluded // Исключаем файл
      })

    if (files.length === 0) {
      console.warn(
        `\x1b[41m[Warning]\x1b[0m No images found for style "${style}"`
      )
      return null
    }

    console.log(`[Info] Filtered files: ${files}`)
    const randomIndex = Math.floor(Math.random() * files.length)
    console.log(
      `[Debug] Random index: ${randomIndex}, Files length: ${files.length}`
    )
    const randomFile = files[randomIndex]
    console.log(`\x1b[44m[Selected]\x1b[0m Random file: ${randomFile}`)
    const filePath = path.join(styleFolderPath, randomFile)

    const imageData = fs.readFileSync(filePath, { encoding: "base64" })
    const mimeType = randomFile.endsWith(".png") ? "image/png" : "image/jpeg"

    return `data:${mimeType};base64,${imageData}`
  } catch (error) {
    console.error(
      `\x1b[41m[Error]\x1b[0m Error retrieving image for style "${style}"`,
      error
    )
    return null
  }
}

if (startOverButton) {
  startOverButton.addEventListener("click", () => {
    selectedStyle = ""
    selectedGender = ""
    resultImage.src = ""
    stopCamera()
    showScreen("gender-screen")
  })
}

if (printPhotoButton) {
  printPhotoButton.addEventListener("click", () => {
    printPhotoButton.disabled = true
    printPhotoButton.textContent =
      translations[currentLanguage].printButtonTextWaiting
    setTimeout(() => {
      printPhotoButton.disabled = false
      printPhotoButton.textContent =
        translations[currentLanguage].printButtonText
    }, 4000)

    if (resultImage && resultImage.src) {
      const imageData = resultImage.src
      const isLandscape = resultImage.width > resultImage.height
      ipcRenderer.send("print-photo", {
        imageData: imageData,
        isLandscape: isLandscape,
      })
    } else {
      console.error("Image not found for printing.")
    }
  })
}

ipcRenderer.on("print-photo-response", (event, success) => {
  if (success) {
    console.log("Print job completed successfully.")
  } else {
    console.error("Print job failed.")
  }
})

backButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const currentScreen = document.querySelector(".screen.active")
    switch (currentScreen.id) {
      case "style-screen":
        showScreen("gender-screen")
        break
      case "gender-screen":
        showScreen("splash-screen")
        break
      case "camera-screen":
        if (!button.disabled) {
          if (countdownInterval) {
            clearInterval(countdownInterval)
            countdownInterval = null
          }
          countdownElement.textContent = ""
          stopCamera()
          showScreen("style-screen")
        }
        break
      case "processing-screen":
        showScreen("camera-screen")
        break
      case "result-screen":
        showScreen("gender-screen")
        selectedStyle = ""
        selectedGender = ""
        break
    }
  })
})

window.addEventListener("resize", handleOrientationChange)

function handleOrientationChange() {
  try {
    if (window.innerHeight > window.innerWidth) {
      console.log("Портретная ориентация")
      // Дополнительная логика для портретной ориентации, если необходимо
    } else {
      console.log("Ландшафтная ориентация")
      // Дополнительная логика для ландшафтной ориентации, если необходимо
    }
  } catch (error) {
    console.error("Error in handleOrientationChange:", error)
  }
}
handleOrientationChange()

const inactivityTimeout = config.inactivityTimeout || 60000
let inactivityTimer
function resetInactivityTimer() {
  try {
    clearTimeout(inactivityTimer)
    inactivityTimer = setTimeout(() => {
      showScreen("splash-screen")
      selectedStyle = ""
      selectedGender = ""
      resultImage.src = ""
      stopCamera()
    }, inactivityTimeout)
  } catch (error) {
    console.error("Error in resetInactivityTimer:", error)
  }
}
;["click", "mousemove", "keypress", "touchstart"].forEach((event) => {
  document.addEventListener(event, resetInactivityTimer)
})
resetInactivityTimer()

function updateTexts() {
  try {
    const texts = translations[currentLanguage]
    if (!texts) return

    const screenTitles = {
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

    const startButton = document.getElementById("start-button")
    if (startButton) {
      startButton.textContent = texts.startButtonText
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

    if (languageSwitcher) {
      languageSwitcher.textContent = currentLanguage === "ru" ? "KK" : "RU"
      languageSwitcher.style.display = config.language?.showSwitcher
        ? "block"
        : "none"
    }

    updatePrintButtonVisibility()

    // const selectedParamsText = document.getElementById("selected-params-text");
    // if (selectedParamsText) {
    //   const genderText = texts.genders[selectedGender] || selectedGender;
    //   let styleText = "";
    //   if (!hasBrackets) {
    //     styleText =
    //       document.querySelector(`[data-style="${selectedStyle}"]`)?.querySelector("div")?.textContent || selectedStyle;
    //   } else {
    //     styleText = resultShowStyle[1];
    //   }
    //   selectedParamsText.innerHTML = `${texts.genderScreenTitleEnd}:  <strong>${genderText}</strong><br/>${texts.styleScreenTitleEnd}:  <strong>${styleText}</strong>`;
    // }

    loaderMessages = translations[currentLanguage].loaderMessages || []
    currentMessageIndex = 0
  } catch (error) {
    console.error("Error in updateTexts:", error)
  }
}

const startupTimeStart = performance.now()
function logStartupTime() {
  const startupTimeEnd = performance.now()
  const startupDuration = startupTimeEnd - startupTimeStart
  console.log(`Время запуска: ${startupDuration.toFixed(2)} мс`)
}

document.addEventListener("DOMContentLoaded", () => {
  updateTexts()
  logStartupTime()
  initGenderButtons()
  setGenderImages()
})

function applyTheme(theme) {
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
applyTheme(config.theme || "light")

const startButton = document.getElementById("start-button")
if (startButton) {
  startButton.addEventListener("click", () => {
    showScreen("gender-screen")
  })
}

let currentLanguage = config.language?.current || "ru"
const languageSwitcher = document.getElementById("language-switcher")
if (languageSwitcher) {
  languageSwitcher.style.display = config.language?.showSwitcher
    ? "block"
    : "none"
  languageSwitcher.addEventListener("click", () => {
    currentLanguage = currentLanguage === "ru" ? "kk" : "ru"
    config.language.current = currentLanguage
    fs.writeFileSync(
      path.join(__dirname, "config.json"),
      JSON.stringify(config, null, 2)
    )
    updateTexts()
  })
}

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

function applySettings() {
  try {
    if (config.animationEnabled) {
      document.body.classList.add("animated-background")
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
applySettings()

let loaderMessages = translations[currentLanguage].loaderMessages || []
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

let currentMessageIndex = 0
function displayNextMessage() {
  const processingScreen = document.getElementById("processing-screen")
  if (processingScreen.classList.contains("active")) {
    if (loaderMessages.length > 0) {
      createFloatingText(loaderMessages[currentMessageIndex])
      currentMessageIndex = (currentMessageIndex + 1) % loaderMessages.length
    }
  }
}
setInterval(displayNextMessage, 2000)

function setGenderImages() {
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
}

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

function updateProgressBar(percent) {
  progressBarFill.style.width = percent + "%"
  progressPercentage.textContent = percent + "%"
}
