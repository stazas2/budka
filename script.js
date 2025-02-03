// ================== SCRIPT.JS (HINTS) ================== //
// IMPORTS AND REQUIREMENTS
// DOM ELEMENTS
// CONFIGURATION AND STATE
// STYLE HANDLING MODULE
// GENDER HANDLING MODULE
// CAMERA MODULE
// COUNTDOWN MODULE
// IMAGE PROCESSING MODULE
// UI NAVIGATION MODULE
// PRINTING MODULE
// LOCALIZATION MODULE
// THEME HANDLING MODULE
// INACTIVITY HANDLER MODULE
// EVENT LISTENERS
// CANON MODULE

//* ================ IMPORTS AND REQUIREMENTS ================
const { ipcRenderer } = require("electron")
const fs = require("fs")
const path = require("path")
const { loadConfig } = require("./utils/configLoader")
const { saveImageWithUtils } = require("./utils/saveUtils")
const QRCode = require("qrcode")

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
let videoStream = null
let cameraInitialized = false
let selectedGenders = []
// Параметры для отображения в конце
// let resultShowStyle = ""
// let hasBrackets = false

let config = loadConfig()
const translations = require("./translations.json")
const basePath = config.basePath
const basePathName = path.basename(basePath)
const baseDir = path.join(basePath, "SavedPhotos")
const stylesDir = config.stylesDir.replace("{{basePath}}", basePath)
// const localhost = config.localhost
const localhost = "http://localhost:5000"
const imagesFolder = `./canon/SavedPhotos/` // Замените на путь к папке с изображениями

const printLogo = config?.logoPath
brandLogo.src = config?.brandLogoPath
brandLogo.style.transform = `scale(${config.mainLogoScale})`
document.body.classList.add(`rotation-${config.camera_rotation}`)
document.body.classList.add(`camera-${config.cameraMode}`)
document.body.classList.add(
  `brandLogo-${config.brandLogoPath ? "true" : "false"}`
)
const logo_pos_x = config.logo_pos_x
const logo_pos_y = config.logo_pos_y

if (!fs.existsSync(brandLogo.src.replace(/^file:\/\/\//, ""))) {
  config.brandLogoPath = ""
}

config?.showResultQrBtn
  ? (showResultQrBtn.style.display = "block")
  : (showResultQrBtn.style.display = "none")

//* ================ CANON MODULE ================

let liveViewInterval
let lastLiveViewUpdate = null
let isFetchingLiveView = false

const liveViewImage = document.getElementById("liveViewImage")
const liveViewContainer = document.getElementById("liveViewContainer")
const noResponseWarning = document.createElement("p")
let cameraMode = config.cameraMode
if (!cameraMode) {
  cameraMode = "pc"
}
let isEvf = config.isEvf

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

//* ================ STYLE HANDLING MODULE ================
// === Управление стилями ===
// Инициализирует кнопки стилей на основе полученных данных
function initStyleButtons(parsedStyles) {
  try {
    // Filter out duplicate styles based on style.originalName
    const uniqueStyles = parsedStyles.filter(
      (style, index, self) =>
        index === self.findIndex((s) => s.originalName === style.originalName)
    )
    console.log("Отфильтрованные стили: ", uniqueStyles)
    amountOfStyles = uniqueStyles.length

    if (!styleButtonsContainer) {
      console.error("Element style-buttons not found.")
      return
    }
    styleButtonsContainer.innerHTML = ""

    // console.log(uniqueStyles)

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
          // Изображение по умолчанию
          img.src = `${stylesDir}/default.png`
        }
        img.alt = style.displayName
        const label = document.createElement("div")
        const match = style.displayName.match(/\(([^)]+)\)/)

        // Скрыть названия стилей
        if (config.showStyleNames) {
          label.textContent = match ? match[1] : style.displayName
        } else label.textContent = ""

        button.appendChild(img)
        button.appendChild(label)
        console.log(`Style button created: ${style}`)

        button.addEventListener("click", () => {
          selectedStyle = style.originalName.replace(/\s*\(.*?\)/g, "")
          nameDisplay = style.originalName
          // hasBrackets = /\(.*?\)/.test(style.originalName)
          // if (hasBrackets) {
          //   resultShowStyle = style.originalName.match(/\((.*?)\)/)
          // }
          showScreen("camera-screen")
          console.log(`Style selected: ${selectedStyle}`)
        })

        button.style.animationDelay = `${index * 0.3}s`
        styleButtonsContainer.appendChild(button)
      })
    } else if (amountOfStyles === 0) {
      alert(`No styles found for the ${selectedGenders}`)
      showScreen("gender-screen")
    } else {
      selectedStyle = uniqueStyles[0].originalName.replace(/\s*\(.*?\)/g, "")
      nameDisplay = uniqueStyles[0].originalName

      showScreen("camera-screen")
      console.log(`Style selected: ${selectedStyle}`)
    }
  } catch (error) {
    console.error("Error in initStyleButtons:", error)
  }
}

// Запрашивает доступные стили с сервера
function fetchStyles() {
  try {
    ipcRenderer
      .invoke("get-styles", selectedGenders)
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

//* ================ GENDER HANDLING MODULE ================
// === Управление выбором пола ===
// Инициализирует кнопки выбора пола и их обработчики
function initGenderButtons() {
  try {
    continueButton.disabled = true
    continueButton.style.display = config.allowMultipleGenderSelection
      ? "block"
      : "none"

    genderButtons.forEach((item, index) => {
      item.style.animationDelay = `${index * 0.3}s`
      item.classList.add("animate")
      // Удаляем старые обработчики
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

          console.log("Selected genders:", selectedGenders)
          // continueButton.style.display = selectedGenders.length > 0 ? "block" : "none";
        } else {
          // Режим одиночного выбора
          genderButtons.forEach((btn) => btn.classList.remove("selected"))
          selectedGenders = [gender]
          console.log(selectedGenders)
          showScreen("style-screen")
          fetchStyles()
        }
      })
    })

    continueButton.addEventListener("click", () => {
      if (selectedGenders.length > 0) {
        showScreen("style-screen")
        fetchStyles()
      }
    })
  } catch (error) {
    console.error("Error in initGenderButtons:", error)
  }
}

// Устанавливает изображения для кнопок выбора пола
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

// Преобразует массив разрешенных полов в плоский список
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

//* ================ CAMERA MODULE ================
// === Управление камерой ===
// Инициализирует и запускает камеру с оптимальным разрешением
async function startCamera() {
  try {
    liveViewContainer.style.display = "none"
    const videoContainer = document.querySelector(".video-container")
    const cameraBackButton = document.querySelector(
      "#camera-screen .back-button"
    )
    cameraBackButton.disabled = true
    try {
      // video
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
        new Promise(
          (_, reject) =>
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

// Останавливает работу камеры и очищает ресурсы
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

// Делает снимок с камеры с учетом поворота
async function takePicture() {
  let imageData = null

  try {
    // if (cameraMode === "canon") {
    if (cameraMode === "canon") {
      try {
        await capture();

        if (!window.lastCapturedBlob) {
          console.warn("No captured blob available; falling back to SavedPhotos.");
          return;
        }
      
        // console.log("Object URL: \n", window.lastCapturedBlob);
      
        // 1. Преобразуем Blob в Image
        const imageUrl = URL.createObjectURL(window.lastCapturedBlob);
        const img = new Image();
        img.src = imageUrl;
        await new Promise((resolve) => (img.onload = resolve));
      
        // 2. Поворачиваем изображение на canvas
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const rotationAngle = config.send_image_rotation || 0;
      
        // Настраиваем размеры canvas в зависимости от угла поворота
        if (rotationAngle === 90 || rotationAngle === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }
      
        // Применяем поворот
        context.save();
        context.translate(canvas.width / 2, canvas.height / 2);
        context.rotate((rotationAngle * Math.PI) / 180);
        context.drawImage(
          img,
          -img.width / 2,
          -img.height / 2,
          img.width,
          img.height
        );
        context.restore();
      
        // 3. Сохраняем в формате без потерь (PNG)
        const rotatedImageData = canvas.toDataURL("image/png"); // PNG сохраняет качество
        // const rotatedImageData = canvas.toDataURL("image/jpeg", 1.0)

        // 4. Освобождаем ресурсы
        URL.revokeObjectURL(imageUrl);
      
        // 5. Отправляем на сервер
        await sendDateToServer(rotatedImageData);
        console.log("Canon photo captured and processed.");

        // ! 2
        // await capture()
        // // NEW: use the stored live view blob rather than reading a file from disk
        // if (window.lastCapturedBlob) {
        //   console.log("object URL: \n", window.lastCapturedBlob)
        //   imageData = await convertBlobToBase64(window.lastCapturedBlob)
        //   console.log("Canon photo captured from live view blob.")
        // } else {
        //   console.warn(
        //     "No captured blob available; falling back to SavedPhotos."
        //   )
        // }
        // await sendDateToServer(imageData)
        // !
      } catch (error) {
        console.error("Error in takePicture:", error)
        alert("Failed to take picture.")
        showScreen("style-screen")
      }
    } else {
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

      imageData = canvas.toDataURL("image/jpeg", 1.0)
      console.log("Picture taken successfully")

      try {
        await saveImageWithUtils("input", imageData)
        console.log("Input image saved successfully")
      } catch (error) {
        console.error("Failed to save input image:", error)
      }

      await sendDateToServer(imageData)
    }
  } catch (error) {
    console.error("Error in takePicture:", error)
    alert("Failed to take picture.")
    showScreen("style-screen")
  }
}

const resolutions = [
  { width: 1920, height: 1280 },
  { width: 1080, height: 720 },
  { width: 640, height: 480 },
]

// Находит оптимальное разрешение для камеры устройства
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

//* ================ COUNTDOWN MODULE ================
// === Управление обратным отсчетом ===
// Запускает обратный отсчет перед съемкой
function startCountdown() {
  try {
    if (!cameraInitialized && cameraMode === "pc") {
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

// Выполняет обратный отсчет и делает снимок
function beginCountdown() {
  try {
    let countdown = config.prePhotoTimer || 5
    const backButton = document.querySelector("#camera-screen .back-button")
    countdownElement.textContent = countdown
    countdownInterval = setInterval(async () => {
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
        await takePicture()
      }
    }, 1000)
  } catch (error) {
    console.error("Error in beginCountdown:", error)
  }
}

//* ================ IMAGE PROCESSING MODULE ================
// === Обработка изображений ===
// Отправляет фото на сервер для обработки
async function sendDateToServer(imageData) {
  try {
    console.log("sending image to server")
    showScreen("processing-screen")

    let urlImage = null

    //todo не видит фото с камеры
    if (cameraMode === "canon") {
      if (imageData) {
        // // Проверяем, является ли imageData уже base64-строкой
        // if (typeof imageData === "string" && imageData.startsWith("data:image")) {
        //   urlImage = imageData.split(",")[1]; // Извлекаем base64 без префикса
        // } else {
        //   // Если imageData не является base64, конвертируем его
        //   urlImage = convertImageToBase64(imageData);
        // }
        urlImage = imageData.split(",")[1]
      } else {
        console.error("Изображение не найдено!")
        urlImage = null // Явно указываем, что urlImage равен null
      }
    } else urlImage = imageData.split(",")[1]

    console.log('\n\n' + urlImage)

    const fonImage = getRandomImageFromStyleFolder(nameDisplay)
    const base64FonImage = fonImage ? fonImage.split(",")[1] : urlImage

    // Логотив в формате base64
    const logoData = fs.readFileSync(printLogo, { encoding: "base64" })
    const base64Logo = `data:image/png;base64,${logoData}`.split(",")[1]

    const genders = selectedGenders.join(", ")


    const data = {
      mode: `${config?.mode}` || "Avatar",
      style: selectedStyle,
      return_s3_link: true,
      event: basePathName,
      logo_base64: base64Logo,
      logo_pos_x,
      logo_pos_y,
      logo_scale: 100,
      params: {
        Sex: genders,
        Face: urlImage,
        Fon: base64FonImage,
      },
    }

    // todo
    // console.log("Кукусики: \n" + data.params.Face)

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
    progressBarFill.style.width = "100%"
    progressPercentage.style.display = "none"

    fetch("http://90.156.158.209/api/handler/", fetchOptions)
      .then((response) => {
        console.log("HTTP response status:", response.status)
        if (!response.ok) throw new Error("Network error: " + response.status)
        return response.json()
      })
      .then((responseData) => {
        console.log("Data received from server:", responseData)
        handleServerResponse(responseData)
      })
      .catch(() => {
        fetch("http://85.95.186.114/api/handler/", fetchOptions)
          .then((response) => {
            console.log("HTTP response status:", response.status)
            if (!response.ok)
              throw new Error("Network error: " + response.status)
            return response.json()
          })
          .then((responseData) => {
            handleServerResponse(responseData)
          })
          .catch((error) => {
            console.error("Error sending data to backup server:", error)
            alert("Error sending the image to the server.")
            showScreen("style-screen")
          })
      })
  } catch (error) {
    console.error("Error in sendDateToServer:", error)
  }
}

// Генерирует QR-код для ссылки на фото
async function generateQrCodeFromURL(url) {
  try {
    const qrCodeData = await QRCode.toDataURL(url) // Генерация QR-кода в формате Base64
    return qrCodeData
  } catch (err) {
    console.error("Ошибка при генерации QR-кода:", err)
    throw err
  }
}

// Обрабатывает ответ сервера с обработанным изображением
async function handleServerResponse(responseData) {
  try {
    const imagesArray = Object.values(responseData)[0]
    if (imagesArray && imagesArray.length > 0) {
      const cleanedURL = imagesArray[0].replace("?image_url=", "").trim()

      // todo: добавить проверку
      resultImage.src = cleanedURL
      await saveImageWithUtils("output", resultImage.src)

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

      try {
        const qrCodeData = await generateQrCodeFromURL(imagesArray[0])
        qrCodeImage.src = qrCodeData
      } catch (error) {
        console.error("Error in getQrDate:", error)
      }
    } else {
      alert("Failed to retrieve processed image.")
      showScreen("style-screen")
    }
  } catch (error) {
    console.error("Error in handleServerResponse:", error)
  }
}

// Выбирает случайный фон из папки стиля
function getRandomImageFromStyleFolder(style) {
  try {
    const styleFolderPath = path.join(stylesDir, selectedGenders[0], style)

    if (!fs.existsSync(styleFolderPath)) {
      console.warn(
        `\x1b[41m[Warning]\x1b[0m Folder for style "${style}" and gender "${selectedGenders[0]}" does not exist.`
      )
      return null
    }

    console.log(`[Info] Reading folder: ${styleFolderPath}`)

    // Очистка стиля (удаляем содержимое скобок)
    const cleanedStyle = style.replace(/\s*\(.*?\)/g, "") // Убираем пробелы и содержимое в скобках
    const excludeList = [
      `1${cleanedStyle}.jpg`,
      `1${cleanedStyle}.jpeg`,
      `1${cleanedStyle}.png`,
    ]

    const files = fs
      .readdirSync(styleFolderPath)
      .filter((file) => /\.(jpg|jpeg|png)$/i.test(file)) // Оставляем только изображения
      .filter((file) => {
        const isExcluded = excludeList.includes(file)
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

    console.log(`[Info] Фильтрованные файлы: ${files}`)

    // Инициализируем индекс для стиля, если он еще не существует
    if (!styleImageIndices[style]) {
      styleImageIndices[style] = 0
    }

    // Используем текущий индекс для выбора файла
    const currentIndex = styleImageIndices[style]
    const fileName = files[currentIndex]

    // Обновляем индекс для следующего вызова
    styleImageIndices[style] = (currentIndex + 1) % files.length

    console.log(`[Selected] Выбранный фон: ${fileName}`)
    const filePath = path.join(styleFolderPath, fileName)

    const imageData = fs.readFileSync(filePath, { encoding: "base64" })
    const mimeType = fileName.endsWith(".png") ? "image/png" : "image/jpeg"

    return `data:${mimeType};base64,${imageData}`
  } catch (error) {
    console.error(
      `\x1b[41m[Error]\x1b[0m Error retrieving image for style "${style}"`,
      error
    )
    return null
  }
}

//* ================ UI NAVIGATION MODULE ================
// === Навигация по экранам ===
// Переключает видимость экранов приложения
async function showScreen(screenId) {
  try {
    console.log(`Switching to screen: ${screenId}`)

    // if (screenId === "loading-screen" && config.cameraMode !== "canon") {
    //   console.log("Skipping loading-screen in canon mode.")
    //   return
    // }

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
        }, 4000)
        const styleButtons = document.getElementById("style-buttons")
        if (styleButtons) {
          styleButtons.scrollTop = 0
        }
      }

      if (screenId === "splash-screen") {
        selectedStyle = ""
        resultImage.src = ""
        stopCamera()
        //?
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
        resultTitle.style.display = "block"
        // await endLiveView()
      } else {
        resultTitle.style.display = "none"
      }

      if (screenId === "camera-screen") {
        if (cameraMode === "canon") {
          video.style.display = "none"
          // todo ( обязательно ли это?)
          liveViewContainer.style.display = "block"
          startCountdown() // Убедитесь, что обратный отсчет запускается для режима canon
        } else {
          // Запускаем камеру при отображении экрана camera-screen
          startCamera()
            .then(() => {
              // Начинаем обратный отсчет после инициализации камеры
              startCountdown()
            })
            .catch((err) => {
              alert("Unable to access the webcam.")
              console.log("Error: " + err)
              amountOfStyles === 1
                ? showScreen("gender-screen")
                : showScreen("style-screen")
            })
        }
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
      if (config.brandLogoPath) {
        logoContainer.style.display = "block"
      }
    }
  } catch (error) {
    console.error(`Error in showScreen (${screenId}):`, error)
  }
}

if (!config.brandLogoPath) {
  const logoContainer = document.getElementById("logo-container")
  logoContainer.style.display = "none"
}

//* ================ PRINTING MODULE ================
if (startOverButton) {
  startOverButton.addEventListener("click", () => {
    selectedStyle = ""
    resultImage.src = ""
    stopCamera()
    showScreen("splash-screen")
    qrCodeImage.style.display = "none"
    qrCodeAgree.style.display = "initial"
    // if (config) {
    //   try {
    //     config = loadConfig()
    //     console.log('Конфиг перезагружен')
    //     clearTimeout(inactivityTimer)
    //     updateTexts()
    //     handleOrientationChange()
    //     applyRotationStyles()
    //     initGenderButtons()
    //     setGenderImages()
    //     applyTheme(config.theme || "light")
    //     applySettings()
    //   } catch (error) {
    //     console.error("Error in startOverButton click event:", error)
    //   }
    // }
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
      console.log(
        `isLandscape: ${isLandscape}: ${resultImage.width}x${resultImage.height}`
      )
      ipcRenderer.send("print-photo", {
        imageData: imageData,
        isLandscape,
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

//* ================ LOCALIZATION MODULE ================
// === Локализация ===
// Обновляет все текстовые элементы согласно выбранному языку
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

    if (startButton) {
      startButton.textContent = texts.startButtonText
      // if (config.showQrIcon) {
      //   startButton.innerHTML = `
      //     <img src="./icons/fi_printer.svg" width="25" height="25" st alt="Printer Icon"/>
      //     ${texts.startButtonText}
      //   `
      // } else {
      //   startButton.textContent = texts.startButtonText
      // }
    }

    if (continueButton) {
      continueButton.textContent = texts.continueButtonText
    }

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

//* ================ THEME HANDLING MODULE ================
// === Управление темой ===
// Применяет выбранную тему оформления
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

      // if (config.theme === "light") {
      //   if (!fs.existsSync(path.join(basePath, config.lightTheme.backgroundImage))) {
      //     config.animationEnabled = true
      //   }
      // } else if (!fs.existsSync(path.join(basePath, config.darkTheme.backgroundImage))) {
      //   config.animationEnabled = true
      // }

      // Проверяем тему, если нет картинки и цвета, либо неправильны, то включаем анимацию
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

applyTheme(config.theme || "light")

// Применяет общие настройки приложения
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

applySettings()

//* ================ INACTIVITY HANDLER MODULE ================
// === Управление бездействием ===
// Сбрасывает таймер бездействия
const inactivityTimeout = config.inactivityTimeout || 60000
let inactivityTimer
function resetInactivityTimer() {
  try {
    clearTimeout(inactivityTimer)
    inactivityTimer = setTimeout(() => {
      showScreen("splash-screen")
      selectedStyle = ""
      // selectedGenders = []
      // genderButtons.forEach((item) => {
      //   item.classList.remove("selected")
      // })
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

//* ================ EVENT LISTENERS ================
document.addEventListener("DOMContentLoaded", () => {
  if (config.cameraMode !== "canon") {
    // loadingScreen.style.display = "none"
    showScreen("splash-screen")
  }

  updateTexts()
  initGenderButtons()
  setGenderImages()
  // applyRotationStyles()
  // logStartupTime()
})

//? Записывает время запуска приложения
// function logStartupTime() {
//   const startupTimeEnd = performance.now()
//   const startupDuration = startupTimeEnd - startupTimeStart
//   console.log(`Время запуска: ${startupDuration.toFixed(2)} мс`)
// }
// const startupTimeStart = performance.now()

backButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const currentScreen = document.querySelector(".screen.active")
    switch (currentScreen.id) {
      case "style-screen":
        selectedGenders = []
        genderButtons.forEach((item) => {
          item.classList.remove("selected")
        })
        showScreen("gender-screen")
        break
      case "gender-screen":
        selectedGenders = []
        genderButtons.forEach((item) => {
          item.classList.remove("selected")
        })
        showScreen("splash-screen")
        break
      case "camera-screen":
        if (!button.disabled && amountOfStyles > 1) {
          if (countdownInterval) {
            clearInterval(countdownInterval)
            countdownInterval = null
          }
          countdownElement.textContent = ""
          stopCamera()
          showScreen("style-screen")
        } else if (amountOfStyles === 1) {
          selectedGenders = []
          genderButtons.forEach((item) => {
            item.classList.remove("selected")
          })
          showScreen("gender-screen")
        }
        break
    }
  })
})

window.addEventListener("resize", handleOrientationChange)

// Обработка изменения ориентации экрана
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

// Управляет видимостью кнопки печати
function updatePrintButtonVisibility() {
  if (config.printButtonVisible) {
    printPhotoButton.style.display = "block"
  } else {
    printPhotoButton.style.display = "none"
  }
}

// Добавляем объект для хранения индексов для каждого стиля
const styleImageIndices = {}

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
    showScreen("gender-screen")
    selectedGenders = []
    genderButtons.forEach((item) => {
      item.classList.remove("selected")
    })
  })
}

let currentLanguage = config.language?.current || "ru"
if (languageSwitcher) {
  languageSwitcher.style.display = config.language?.showSwitcher
    ? "block"
    : "none"
  languageSwitcher.addEventListener("click", () => {
    currentLanguage = currentLanguage === "ru" ? "kz" : "ru"
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

let loaderMessages = translations[currentLanguage].loaderMessages || []

// Создает анимированный текст во время обработки
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

// Показывает следующее сообщение в процессе обработки
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

const customCheckboxQr = document.querySelector(".custom-checkbox-qr")
if (customCheckboxQr) {
  customCheckboxQr.addEventListener("click", function (event) {
    qrCodeImage.style.display = "none"
    showModal()
  })
}

// Показывает модальное окно
function showModal() {
  if (modal) {
    modal.style.display = "flex"
  }
}

if (modal) {
  modal.addEventListener("click", function (event) {
    if (
      event.target === modal ||
      event.target.classList.contains("close-modal")
      // ||
      // event.target.classList.contains("modal-content")
    ) {
      modal.style.display = "none"
    }
  })
}

// Show QR button handler
showResultQrBtn.addEventListener("click", () => {
  // Use the existing showModal or similar method
  qrCodeAgree.style.display = "none"
  qrCodeImage.style.display = "initial"
  showModal()
})

//* ================ CANON MODULE ================

// noResponseWarning.style.color = 'red';
// noResponseWarning.textContent = 'Давно не было ответа от Live View.';
// noResponseWarning.style.display = 'none';
// liveViewContainer.parentNode.insertBefore(noResponseWarning, liveViewContainer.nextSibling);

async function startLiveView() {
  isEvf = true
  try {
    await fetch(`${localhost}/api/post/evf/start`, { method: "POST" }) // Исправьте URL
    liveViewInterval = setInterval(updateLiveView, 100)
    lastLiveViewUpdate = Date.now()
    noResponseWarning.style.display = "none"
  } catch (error) {
    console.error("Ошибка при включении Live View:", error)
  }
}

async function endLiveView() {
  isEvf = false
  try {
    await fetch(`${localhost}/api/post/evf/end`, { method: "POST" }) // Исправьте URL
    clearInterval(liveViewInterval)
    liveViewImage.style.display = "none"
    noResponseWarning.style.display = "none"
  } catch (error) {
    console.error("Ошибка при выключении Live View:", error)
  }
}

async function updateLiveView() {
  if (isFetchingLiveView) {
    return
  }

  isFetchingLiveView = true

  try {
    const response = await fetch(`${localhost}/api/get/live-view`) // Исправьте URL
    if (response.ok) {
      const blob = await response.blob()
      liveViewImage.src = URL.createObjectURL(blob)
      liveViewImage.style.display = "block"
      liveViewImage.onload = () => URL.revokeObjectURL(liveViewImage.src)
      lastLiveViewUpdate = Date.now()
      noResponseWarning.style.display = "none"
      window.lastCapturedBlob = blob // NEW: store the current live view blob
    }
  } catch (error) {
    console.error("Ошибка live view:", error)
  } finally {
    isFetchingLiveView = false
  }

  // if (lastLiveViewUpdate && Date.now() - lastLiveViewUpdate > 60000) {
  //   noResponseWarning.style.display = "block"
  //   clearInterval(liveViewInterval)
  // }
}

async function reconnect() {
  const wasEvfActive = isEvf
  try {
    if (wasEvfActive) {
      console.log("Выключаем EVF перед реконнектом...")
      await endLiveView()
      console.log("EVF выключен.")
    }

    console.log("Реконнект...")
    await fetch(`${localhost}/api/post/reconnect`, { method: "POST" }) // Исправьте URL
    console.log("Реконнект успешен.")

    if (wasEvfActive) {
      console.log("Ждем 3 секунды перед включением EVF...")
      await new Promise((resolve) => setTimeout(resolve, 5000))
      console.log("Включаем EVF после реконнекта...")
      await startLiveView()
      console.log("EVF включен.")
    }
  } catch (error) {
    console.error("Ошибка реконнекта:", error)
  }
}

async function capture() {
  try {
    const response = await fetch(
      `${localhost}/api/post/capture-image/capture`,
      {
        method: "POST",
      }
    )
    // const responseDiv = document.getElementById('captureImageResponse');

    const data = await response.json()

    if (response.ok) {
      console.log("Снимок сделан успешно")
    } else {
      console.log(`Ошибка: ${data.error}`)
    }
  } catch (error) {
    // const responseDiv = document.getElementById('captureImageResponse');
    // responseDiv.textContent = `Ошибка при съемке: ${error.message}`;
    // responseDiv.style.color = 'red';
    // responseDiv.style.display = 'block';
    console.error("Ошибка:", error)
  }
}

// Получение последнего изображения
function getLatestImage(folderPath) {
  try {
    // Читаем список файлов в папке
    const files = fs
      .readdirSync(folderPath)
      .map((file) => ({
        name: file,
        time: fs.statSync(path.join(folderPath, file)).mtime.getTime(), // Получаем время модификации
      }))
      .sort((a, b) => b.time - a.time) // Сортируем по времени, от самого нового к старому

    if (files.length === 0) {
      console.error("Папка пуста.")
      return null
    }

    return path.join(folderPath, files[0].name) // Возвращаем путь к последнему файлу
  } catch (error) {
    console.error("Ошибка при поиске файлов:", error)
    return null
  }
}

// ! convertImageToBase64
// Преобразование изображения в Base64
// function convertImageToBase64(imagePath) {
//   if (imagePath.startsWith("data:")) {
//     // Already a Base64 data URL; extract and return the base64 part.
//     return imagePath.split(",")[1]
//   }
//   try {
//     const data = fs.readFileSync(imagePath) // Читаем файл
//     const base64Image = data.toString("base64") // Конвертируем в Base64
//     // console.log("Base64 изображение:", base64Image)
//     console.log("Base64 изображение готово!")
//     return base64Image
//   } catch (error) {
//     console.error("Ошибка при чтении файла:", error)
//     return null
//   }
// }

// ! convertBlobToBase64
// New helper function to convert a Blob to Base64 string
// function convertBlobToBase64(blob) {
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader()
//     reader.onloadend = () => resolve(reader.result.split(",")[1])
//     reader.onerror = reject
//     reader.readAsDataURL(blob)
//   })
// }

ipcRenderer.on("camera-control-status", (event, isRunning) => {
  console.log("CameraControl.exe running:", isRunning)
  window.cameraControlActive = isRunning
  // When true, trigger screen change (adjust 'target-screen-id' as needed)
  if (isRunning) {
    // targetScreen = "loading-screen"
    // targetScreen.classList.remove("active")
    setTimeout(async () => {
      if (!isEvf) {
        await startLiveView()
      }
      await showScreen("splash-screen")
    }, 3000)

    // e.g., "result-screen" or "camera-screen"
  }
})