const { ipcRenderer } = require("electron")
const fs = require("fs")
const path = require("path")
const { loadConfig } = require("./utils/configLoader")

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
let videoStream = null
let cameraInitialized = false

// Основная папка для хранения изображений
const baseDir = path.join("C:\\MosPhotoBooth2", "SavedPhotos")
const config = loadConfig()

// Применяем вращение для элементов на основе конфигурации
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

// Вызываем функцию для применения стилей после загрузки конфигурации и элементов
applyRotationStyles()

// Функция для создания папок с датой и input/output, если их еще нет
function createDateFolders() {
  try {
    const dateFolder = path.join(
      baseDir,
      new Date().toISOString().slice(0, 10).replace(/-/g, "_")
    )
    const inputDir = path.join(dateFolder, "input")
    const outputDir = path.join(dateFolder, "output")

    // Создаем все необходимые папки рекурсивно
    ;[baseDir, dateFolder, inputDir, outputDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    })

    return { inputDir, outputDir }
  } catch (error) {
    console.error("Error in createDateFolders:", error)
    throw error
  }
}

// Генерация имени файла
function generateFileName() {
  try {
    const date = new Date()
    const timeString = `${date.getHours()}_${date.getMinutes()}_${date.getSeconds()}`
    const randomString = Math.random().toString(36).substring(2, 6) // Случайные символы
    return `${timeString}_${randomString}.jpg`
  } catch (error) {
    console.error("Error in generateFileName:", error)
    throw error
  }
}

// Функция сохранения изображения в формате JPG
function saveImage(folderType, base64Image) {
  console.log(`Saving ${folderType} image...`)
  try {
    const { inputDir, outputDir } = createDateFolders()
    const folderPath = folderType === "input" ? inputDir : outputDir
    const fileName = generateFileName()
    const filePath = path.join(folderPath, fileName)

    const imageData = base64Image.replace(/^data:image\/\w+;base64,/, "")
    fs.writeFileSync(filePath, imageData, "base64")
    console.log(`Image saved successfully to ${filePath}`)
  } catch (error) {
    console.error(`Error in saveImage (${folderType}):`, error)
    throw error
  }
}

// Функция для получения доступных стилей
function fetchStyles() {
  try {
    ipcRenderer
      .invoke("get-styles", selectedGender) // Передаём выбранный пол
      .then((styles) => {
        console.log("Получены стили:", styles)
        initStyleButtons(styles)
      })
      .catch((error) => {
        console.error("Ошибка при загрузке стилей:", error)
        alert("Не удалось загрузить стили. Пожалуйста, попробуйте позже.")
      })
  } catch (error) {
    console.error("Ошибка в fetchStyles:", error)
  }
}

let resultShowStyle = ""
let hasBrackets = false

// Инициализация кнопок стилей
function initStyleButtons(parsedStyles) {
  try {
    if (!styleButtonsContainer) {
      console.error("Element style-buttons not found.")
      return
    }
    styleButtonsContainer.innerHTML = "" // Очистка предыдущих кнопок

    parsedStyles.forEach((style, index) => {
      // console.log("Adding style to UI:", style)
      const button = document.createElement("div")
      button.classList.add("button")
      button.setAttribute("data-style", style.originalName)

      const img = document.createElement("img")
      // Включаем selectedGender в путь к изображению стиля
      const sanitizedDisplayName = style.displayName
        .replace(/\s*\(.*?\)/g, "")
        .replace(/\s+/g, "_")
        .replace(/[^\w\-]+/g, "")
      img.src = `${config.stylesDir}\\${selectedGender}\\${style.originalName}\\1${sanitizedDisplayName}.jpg`
      // console.log(img.src)
      img.alt = style.displayName

      const label = document.createElement("div")
      // Если есть текст в скобках, использовать его
      const match = style.displayName.match(/\(([^)]+)\)/)
      label.textContent = match ? match[1] : style.displayName

      button.appendChild(img)
      button.appendChild(label)
      console.log(`Style button created: ${style}`)

      button.addEventListener("click", () => {
        // Изменение отображаемого названия
        selectedStyle = style.originalName.replace(/\s*\(.*?\)/g, "")
        
        hasBrackets = /\(.*?\)/.test(style.originalName);
        if (hasBrackets) {
          resultShowStyle = style.originalName.match(/\((.*?)\)/)
        }

        console.log(`Style selected: ${selectedStyle}`)
        showScreen("camera-screen") // Изменено с gender-screen на camera-screen
        startCamera()
          .then(() => {
            startCountdown()
          })
          .catch((err) => {
            alert("Unable to access the webcam.")
            showScreen("style-screen")
          })
      })

      // Применение задержки анимации к каждой кнопке
      button.style.animationDelay = `${index * 0.3}s`

      styleButtonsContainer.appendChild(button)
    })
  } catch (error) {
    console.error("Error in initStyleButtons:", error)
  }
}

// Удаление первоначального вызова fetchStyles
// fetchStyles()

// Заменить обработчики кнопок на обработчики button-row_item
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

// Инициализация кнопок гендера с анимацией
function initGenderButtons() {
  try {
    const genderButtons = document.querySelectorAll("#gender-buttons .button-row_item");
    genderButtons.forEach((button, index) => {
      button.style.animationDelay = `${index * 0.3}s`;
      button.classList.add("animate");
    });
  } catch (error) {
    console.error("Error in initGenderButtons:", error);
  }
}

// Показать конкретный экран
function showScreen(screenId) {
  try {
    console.log(`Switching to screen: ${screenId}`)
    // document.querySelectorAll(".screen").forEach((screen) => {
    //   screen.classList.remove("active")
    // })

    // const activeScreen = document.getElementById(screenId)
    // if (activeScreen) {
    //   activeScreen.classList.add("active")
    const currentActive = document.querySelector(".screen.active")
    if (currentActive) {
      currentActive.classList.remove("active")
    }

    const targetScreen = document.getElementById(screenId)
    if (targetScreen) {
      targetScreen.classList.add("active")
      const backButton = targetScreen.querySelector(".back-button")
      if (backButton) {
        if (screenId === "splash-screen" || screenId === "processing-screen") {
          // Убрали camera-screen из этого условия
          backButton.disabled = true
          backButton.style.display = "block"
        } else if (screenId === "result-screen") {
          backButton.style.display = "none"
        } else {
          backButton.disabled = false
          backButton.style.display = "block"
        }
      }

      // Управляем видимостью кнопки переключения темы
      // if (screenId === "splash-screen" || screenId === "gender-screen") {
      //   themeSwitcher.style.display = "block"
      // } else {
      //   themeSwitcher.style.display = "none"
      // }

      if (screenId === "result-screen") {
        resultTitle.style.display = "block"
      } else {
        resultTitle.style.display = "none"
      }
    } else {
      console.error(`Screen with ID "${screenId}" not found.`)
    }

    if (screenId !== "camera-screen" && countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
      countdownElement.textContent = ""
    }
  } catch (error) {
    console.error(`Error in showScreen (${screenId}):`, error)
  }
}

const resolutions = [
  { width: 1920, height: 1280 }, // Full HD
  { width: 1080, height: 720 }, // HD
  { width: 640, height: 480 }, // SD
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
        // Если камера поддерживает разрешение, останавливаем поток и возвращаем разрешение
        stream.getTracks().forEach((track) => track.stop())
        console.log(
          `Supported resolution found: ${resolution.width}x${resolution.height}`
        )
        return resolution
      } catch (error) {
        console.log(
          `Resolution ${resolution.width}x${resolution.height} not supported.`
        )
        // Продолжаем к следующему разрешению
      }
    }
    throw new Error("No supported resolutions found.")
  } catch (error) {
    console.error("Error in findBestResolution:", error)
    throw error
  }
}

// Используем найденное разрешение при запуске камеры
async function startCamera() {
  try {
    console.log("Attempting to start camera...")
    const videoContainer = document.querySelector(".video-container")
    const cameraBackButton = document.querySelector(
      "#camera-screen .back-button"
    ) // Select backButton for camera-screen
    cameraBackButton.disabled = true // Disable backButton during initialization

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

      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          cameraInitialized = true
          console.log("Camera metadata loaded successfully")
          resolve()
        }
      })

      videoContainer.classList.remove("loading")
      console.log("Camera started successfully")
    } catch (error) {
      console.error("Camera initialization failed:", error)
      videoContainer.classList.remove("loading")
      throw error
    } finally {
      cameraBackButton.disabled = false // Re-enable backButton after initialization
    }
  } catch (error) {
    console.error("Error in startCamera:", error)
    throw error
  }
}

// Остановка камеры
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

// Запуск обратного отсчета
function startCountdown() {
  try {
    if (!cameraInitialized) {
      alert("Camera is not ready. Please try again.")
      showScreen("style-screen")
      return
    }
    if (video.readyState >= 1) {
      beginCountdown()
    } else {
      video.onloadedmetadata = beginCountdown
    }
  } catch (error) {
    console.error("Error in startCountdown:", error)
  }
}

// В начале файла добавим переменную для хранения интервала
let countdownInterval // Добавляем глобальную переменную для отслеживания интервала

// Изменим функцию beginCountdown
function beginCountdown() {
  try {
    let countdown = config.prePhotoTimer || 5 // Значение по умолчанию - 5, если нет в конфиге
    const backButton = document.querySelector("#camera-screen .back-button")
    countdownElement.textContent = countdown
    // Сохраняем интервал в переменную
    countdownInterval = setInterval(() => {
      countdown--
      if (countdown > 0) {
        countdownElement.textContent = countdown
        backButton.style.opacity = "1"
        // Блокируем кнопку "Назад" за 2 секунды до конца
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

// Функция для создания снимка
function takePicture() {
  try {
    console.log("Taking picture...")
    try {
      const context = canvas.getContext("2d")
      const rotationAngle = config.send_image_rotation || 0
      console.log(`Applying rotation: ${rotationAngle} degrees`)

      // Определяем размеры для canvas в зависимости от угла поворота
      if (rotationAngle === 90 || rotationAngle === 270) {
        canvas.width = video.videoHeight
        canvas.height = video.videoWidth
      } else {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }

      // Очищаем canvas перед рисованием
      context.clearRect(0, 0, canvas.width, canvas.height)

      // Поворачиваем и рисуем изображение
      context.save()
      context.translate(canvas.width / 2, canvas.height / 2)
      context.rotate((rotationAngle * Math.PI) / 180)

      // Рисуем изображение в зависимости от поворота
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

      //? Восстанавливаем контекст
      context.restore()
      stopCamera()

      // Получаем данные изображения и сохраняем их
      const imageData = canvas.toDataURL("image/jpeg", 1.0)
      console.log("Picture captured successfully")

      try {
        saveImage("input", imageData)
        console.log("Input image saved successfully")
      } catch (error) {
        console.error("Failed to save input image:", error)
      }

      sendImageToServer(imageData)
    } catch (error) {
      console.error("Failed to take picture:", error)
      alert("Failed to take picture. Please try again.")
      showScreen("style-screen")
    }
  } catch (error) {
    console.error("Error in takePicture:", error)
    alert("Failed to take picture. Please try again.")
    showScreen("style-screen")
  }
}

// Отправка изображения на сервер
function sendImageToServer(imageData) {
  try {
    console.log("sendImageToServer() function called")
    showScreen("processing-screen")
    const base64Image = imageData.split(",")[1]

    // Получаем случайное изображение для `Fon` из папки стиля
    const fonImage = getRandomImageFromStyleFolder(selectedStyle)
    const base64FonImage = fonImage ? fonImage.split(",")[1] : base64Image // Используем изображение с камеры, если `Fon` не найдено

    const data = {
      mode: "Avatar", // style_sdxl
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

    // Сохраняем запрос в текстовый файл
    const logFilePath = path.join("C:", "MosPhotoBooth2", "request_log.txt")
    const logContent = `Headers: ${JSON.stringify(
      headers,
      null,
      2
    )}\nData: ${JSON.stringify(data, null, 2)}`
    fs.writeFileSync(logFilePath, logContent, "utf-8")
    console.log(`Request saved to ${logFilePath}`)

    function updateProgressBar(percent) {
      progressBarFill.style.width = percent + "%"
      progressPercentage.textContent = percent + "%"
    }

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
    }, 900) // Обновление каждые полсекунды

    fetch("http://85.95.186.114/api/handler/", fetchOptions)
      .then((response) => {
        console.log("HTTP response status:", response.status)
        if (!response.ok) {
          throw new Error("Network error, status: " + response.status)
        }
        return response.json()
      })
      .then((responseData) => {
        console.log("Data received from server:", responseData)
        clearInterval(progressInterval)
        handleServerResponse(responseData)
      })
      .catch((error) => {
        console.error("Error sending data to server:", error)
        clearInterval(progressInterval)
        alert(
          "An error occurred while sending the image to the server. Check the console for details."
        )
        showScreen("style-screen")
      })
  } catch (error) {
    console.error("Error in sendImageToServer:", error)
  }
}

// Обработка ответа от сервера
async function handleServerResponse(responseData) {
  try {
    console.log("handleServerResponse() function called")
    //! Удалены эти строки для плавного перехода
    // progressBar.style.display = 'none';
    // progressBarFill.style.width = '0%';
    progressBarFill.textContent = ""

    const imagesArray = Object.values(responseData)[0]

    if (imagesArray && imagesArray.length > 0) {
      const base64Image = imagesArray[0]
      const cleanedBase64Image = base64Image.replace(/[\n\r"']/g, "").trim()

      // Создаем изображение и накладываем логотип
      const finalImageWithLogo = await overlayLogoOnImage(cleanedBase64Image)
      resultImage.src = finalImageWithLogo

      // Отображаем выбранные параметры
      const selectedParamsText = document.getElementById("selected-params-text")
      const texts = translations[currentLanguage]
      
      console.log(selectedGender)
      if (selectedParamsText && texts) {
        const genderText = texts.genders[selectedGender] || selectedGender
        let styleText = ""

        if (!hasBrackets) {
          styleText =
            document
              .querySelector(`[data-style="${selectedStyle}"]`)
              ?.querySelector("div")?.textContent || selectedStyle
        } else {
          styleText = resultShowStyle[1]
        }

        selectedParamsText.innerHTML = `${texts.genderScreenTitleEnd}:&emsp;&emsp;<strong>${genderText}</strong><br/>${texts.styleScreenTitleEnd}:&emsp;<strong>${styleText}</strong>`
      }

      // Сохранение готового изображения с логотипом в папку "output"
      saveImage("output", finalImageWithLogo)

      resultImage.onload = () => {
        console.log("Image loaded successfully")
        console.log(
          `Image dimensions: ${resultImage.clientWidth}x${resultImage.clientHeight}`
        )
        showScreen("result-screen")

        // Управление видимостью кнопки печати на экране результата
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

// Функция наложения логотипа
async function overlayLogoOnImage(base64Image) {
  console.warn("overlayLogoOnImage is a stub and does not apply any logos.")
  return new Promise((resolve) => {
    resolve(`data:image/jpeg;base64,${base64Image}`)
  })
}
// async function overlayLogoOnImage(base64Image) {
//   try {
//     return new Promise((resolve) => {
//       const canvas = document.createElement("canvas")
//       const context = canvas.getContext("2d")
//       const mainImage = new Image()
//       const logoImage = new Image()

//       mainImage.src = `data:image/jpeg;base64,${base64Image}`
//       logoImage.src = config.logoPath // Путь к логотипу из конфигурации

//       mainImage.onload = () => {
//         try {
//           canvas.width = mainImage.width
//           canvas.height = mainImage.height
//           context.drawImage(mainImage, 0, 0, canvas.width, canvas.height)

//           // Загружаем логотип и позиционируем его
//           logoImage.onload = () => {
//             console.log("Logo loaded successfully")

//             const offsetX = config.logoOffsetX || 0
//             const offsetY = config.logoOffsetY || 0
//             let x = 0
//             let y = 0

//             // Определение позиции логотипа в зависимости от logoPosition
//             switch (config.logoPosition) {
//               case "top-left":
//                 x = offsetX
//                 y = offsetY
//                 break
//               case "top-right":
//                 x = canvas.width - logoImage.width - offsetX
//                 y = offsetY
//                 break
//               case "bottom-left":
//                 x = offsetX
//                 y = canvas.height - logoImage.height - offsetY
//                 break
//               case "bottom-right":
//                 x = canvas.width - logoImage.width - offsetX
//                 y = canvas.height - logoImage.height - offsetY
//                 break
//               case "center":
//                 x = (canvas.width - logoImage.width) / 2
//                 y = (canvas.height - logoImage.height) / 2
//                 break
//               case "center-top":
//                 x = (canvas.width - logoImage.width) / 2
//                 y = offsetY
//                 break
//               case "center-bottom":
//                 x = (canvas.width - logoImage.width) / 2
//                 y = canvas.height - logoImage.height - offsetY
//                 break
//               default:
//                 console.warn(
//                   `Invalid logo position: ${config.logoPosition}. Defaulting to bottom-right.`
//                 )
//                 x = canvas.width - logoImage.width - offsetX
//                 y = canvas.height - logoImage.height - offsetY
//                 break
//             }

//             // Накладываем логотип
//             context.drawImage(logoImage, x, y)
//             resolve(canvas.toDataURL("image/jpeg"))
//           }

//           logoImage.onerror = () => {
//             console.error("Failed to load logo image. Check logoPath in config.")
//             resolve(canvas.toDataURL("image/jpeg")) // Возвращаем изображение без логотипа
//           }
//         } catch (error) {
//           console.error("Error in overlayLogoOnImage:", error);
//           return null;

//         }

//       }

//       mainImage.onerror = () => {
//         console.error("Failed to load main image.")
//         resolve(null) // Возвращаем null при ошибке
//       }
//     })
//   } catch (error) {
//     console.error("Error in overlayLogoOnImage:", error);
//     return null;
//   }
// }

// Вспомогательная функция для получения случайного изображения из папки стиля
function getRandomImageFromStyleFolder(style) {
  try {
    // Updated path to include selectedGender
    const styleFolderPath = path.join(config.stylesDir, selectedGender, style)
    console.log(
      `Путь изображений (getRandomImageFromStyleFolder): ${styleFolderPath}`
    )

    if (!fs.existsSync(styleFolderPath)) {
      console.warn(
        `Folder for style "${style}" and gender "${selectedGender}" does not exist.`
      )
      return null
    }

    // Получаем все файлы изображений из папки
    const files = fs
      .readdirSync(styleFolderPath)
      .filter((file) => /\.(jpg|jpeg|png)$/i.test(file))
      .filter((file) => file !== `1${style}.jpg`)

    if (files.length === 0) {
      console.warn(`No images found in the folder for style: ${style}`)
      return null
    }

    // Выбираем случайный файл из списка
    const randomFile = files[Math.floor(Math.random() * files.length)]
    const filePath = path.join(styleFolderPath, randomFile)

    // Читаем изображение и конвертируем его в base64
    const imageData = fs.readFileSync(filePath, { encoding: "base64" })
    const mimeType = randomFile.endsWith(".png") ? "image/png" : "image/jpeg"

    return `data:${mimeType};base64,${imageData}`
  } catch (error) {
    console.error(
      `Error retrieving background image for style: ${style} and gender: ${selectedGender}`,
      error
    )
    return null
  }
}

// Обработка нажатия кнопки начала заново
if (startOverButton) {
  startOverButton.addEventListener("click", () => {
    console.log("Start over button clicked")
    selectedStyle = ""
    selectedGender = ""
    resultImage.src = ""
    stopCamera()
    showScreen("gender-screen") // Изменено с 'style-screen' на 'gender-screen'
  })
} else {
  console.error("Start over button not found.")
}

// Обработка нажатия кнопки печати
if (printPhotoButton) {
  printPhotoButton.addEventListener("click", () => {
    console.log("Print photo button clicked")
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
} else {
  console.error("Print photo button not found.")
}

// Обработка ответа печати
ipcRenderer.on("print-photo-response", (event, success) => {
  if (success) {
    console.log("Print job completed successfully.")
  } else {
    console.error("Print job failed.")
  }
})

// Добавьте обработчики для кнопок "Назад"
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
          // Проверяем, не заблокирована ли кнопка
          if (countdownInterval) {
            clearInterval(countdownInterval) // Очищаем интервал
            countdownInterval = null // Обнуляем переменную
          }
          countdownElement.textContent = "" // Очищаем текст счетчика
          stopCamera() // Останавливаем камеру
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

// Добавляем слушатель для изменения ориентации экрана
window.addEventListener("resize", handleOrientationChange)

// Функция для обработки изменения ориентации
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

// Вызываем функцию при загрузке страницы
handleOrientationChange()

// Параметры тайм-аута
const inactivityTimeout = config.inactivityTimeout || 60000 // Тайм-аут по умолчанию 60 секунд

let inactivityTimer

// Функция для сброса таймера неактивности
function resetInactivityTimer() {
  try {
    clearTimeout(inactivityTimer)
    inactivityTimer = setTimeout(() => {
      showScreen("splash-screen") // Возвращаемся на заставку при бездействии
      selectedStyle = ""
      selectedGender = ""
      resultImage.src = ""
      stopCamera()
    }, inactivityTimeout)
  } catch (error) {
    console.error("Error in resetInactivityTimer:", error)
  }
}

// События для сброса таймера при взаимодействии
;["click", "mousemove", "keypress", "touchstart"].forEach((event) => {
  document.addEventListener(event, resetInactivityTimer)
})

// Вызываем resetInactivityTimer при загрузке страницы
resetInactivityTimer()

// currentLanguage = 'ru'; // Язык по умолчанию
// Загрузка переводов
const translations = require("./translations.json")
// Обновляем тексты на основе конфигурации
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

    // Обновляем тексты кнопок
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
      loaderText.textContent = texts.loaderText
    }

    // Обновляем тексты loader-text
    const loaderTexts = document.getElementsByClassName("loader-text")
    if (loaderTexts.length > 0) {
      Array.from(loaderTexts).forEach((loader) => {
        loader.textContent = texts.loaderText
      })
    }

    // Обновляем тексты гендерных кнопок
    const genderButtons = document.querySelectorAll("#gender-buttons .button")
    genderButtons.forEach((button) => {
      const genderKey = button.getAttribute("data-gender")
      button.textContent = texts.genders[genderKey]
    })

    // Обновляем текст на кнопке переключения языка
    if (languageSwitcher) {
      languageSwitcher.textContent = currentLanguage === "ru" ? "KK" : "RU"
      languageSwitcher.style.display = config.language?.showSwitcher ? "block" : "none"
    }

    // Управление видимостью кнопки печати
    updatePrintButtonVisibility()

    // Обновление selectedParamsText на экране результата
    const selectedParamsText = document.getElementById("selected-params-text")
    if (selectedParamsText) {
      const genderText = texts.genders[selectedGender] || selectedGender

      if (!hasBrackets) {
        styleText =
          document
            .querySelector(`[data-style="${selectedStyle}"]`)
            ?.querySelector("div")?.textContent || selectedStyle
      } else {
        styleText = resultShowStyle[1]
      }

      selectedParamsText.innerHTML = `${texts.genderScreenTitleEnd}:&emsp;&emsp;<strong>${genderText}</strong><br/>${texts.styleScreenTitleEnd}:&emsp;<strong>${styleText}</strong>`
    }
  } catch (error) {
    console.error("Error in updateTexts:", error)
  }
}

// Вызываем функцию после загрузки страницы
document.addEventListener("DOMContentLoaded", () => {
  updateTexts()
  logStartupTime()
  initGenderButtons(); // Инициализация анимации для гендерных кнопок
})

// Вызываем функцию обновления текстов после загрузки страницы
document.addEventListener("DOMContentLoaded", () => {
  updateTexts()
})

//! Theme Switcher
// const themeSwitcher = document.getElementById("theme-switcher")

// Функция для применения темы
function applyTheme(theme) {
  try {
    const themeConfig = config[`${theme}Theme`]
    document.body.classList.remove("light", "dark")
    document.body.classList.add(theme)
    // themeSwitcher.checked = theme === "dark"

    if (themeConfig) {
      document.documentElement.style.setProperty(
        "--background-color",
        theme === "light"
          ? config.lightTheme.backgroundColor
          : config.darkTheme.backgroundColor
      )
      // Используем путь из config.json без добавления 'file:///'
      document.documentElement.style.setProperty(
        "--background-image",
        `url("${config.lightTheme.backgroundImage.replace(/\\\\/g, "/")}")`
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

// Устанавливаем начальную тему из конфигурации
applyTheme(config.theme || "light")

// После обработчиков для backButtons добавляем:
// Добавляем обработчик для кнопки "Начать" на заставке
const startButton = document.getElementById("start-button")
if (startButton) {
  startButton.addEventListener("click", () => {
    showScreen("gender-screen") // Переход к экрану выбора пола
  })
} else {
  console.error("Start button not found on splash screen.")
}

// Инициализация языка из конфигурации
let currentLanguage = config.language?.current || "ru"
const languageSwitcher = document.getElementById("language-switcher")

// Управление видимостью переключателя языка
if (languageSwitcher) {
  languageSwitcher.style.display = config.language?.showSwitcher
    ? "block"
    : "none"

  languageSwitcher.addEventListener("click", () => {
    currentLanguage = currentLanguage === "ru" ? "kk" : "ru"
    // Обновляем конфигурацию
    config.language.current = currentLanguage
    fs.writeFileSync(
      path.join(__dirname, "config.json"),
      JSON.stringify(config, null, 2)
    )
    updateTexts()
  })
}

// Получаем кнопку и добавляем слушатель событий для переключения
const fullscreenToggleButton = document.getElementById("fullscreen-toggle")

let clickCount = 0
let clickTimer

fullscreenToggleButton.addEventListener("click", function () {
  clickCount++

  if (clickCount === 3) {
    clickCount = 0 // сброс счетчика для следующей тройки кликов

    // Переключение полноэкранного режима на третий клик
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(
          `Error attempting to enable full-screen mode: ${err.message}`
        )
      })
      clearTimeout(clickTimer)
    } else {
      document.exitFullscreen()
      clearTimeout(clickTimer)
    }
  }

  // Сброс счётчика, если третий клик не произошел за 500 мс
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

// Начало измерения времени запуска
const startupTimeStart = performance.now()

// Функция для логирования времени запуска
function logStartupTime() {
  const startupTimeEnd = performance.now()
  const startupDuration = startupTimeEnd - startupTimeStart
  console.log(`Время запуска приложения: ${startupDuration.toFixed(2)} мс`)
}

// Вызов logStartupTime после полной загрузки DOM
document.addEventListener("DOMContentLoaded", () => {
  updateTexts()
  logStartupTime()
})

// Включение/выключение анимации
function applySettings() {
  try {
    if (config.animationEnabled) {
      document.body.classList.add("animated-background")
    } else {
      document.body.classList.remove("animated-background")
    }

    // Добавляем динамическое применение backdropBlur
    document.documentElement.style.setProperty(
      "--backdrop-blur",
      config.backdropBlur
    )
  } catch (error) {
    console.error("Error in applySettings:", error)
  }
}
applySettings()

//? Нажатие кнопок
// const buttons = document.querySelectorAll('.style-buttons .button');

// buttons.forEach(button => {
//   button.addEventListener('click', () => {
//     // Добавляем класс "pressed"
//     button.classList.add('pressed');

//     // Убираем класс "pressed" через короткую задержку
//     setTimeout(() => {
//       button.classList.remove('pressed');
// });
//     }, 15000); // Задержка для визуального эффекта
//   });
// });

// Processing message' block
const loaderMessages = translations[currentLanguage].loaderMessages || [];

function createFloatingText(message) {
  const textElement = document.createElement('div');
  textElement.className = 'floating-text';
  textElement.innerText = message;

  const randomX = Math.random() * 40 + 30;; 
  const randomY = Math.random() * 40 - 20; // Вверх/вниз относительно прогресс-бара
  textElement.style.left = `${randomX}%`;
  textElement.style.bottom = `${randomY}px`;

  processingScreen.appendChild(textElement);

  // Удаляем текст после завершения анимации
  setTimeout(() => {
    processingScreen.removeChild(textElement);
  }, 2000);
}

let currentMessageIndex = 0;
function displayNextMessage() {
  if (loaderMessages.length > 0) {
    createFloatingText(loaderMessages[currentMessageIndex]);
    currentMessageIndex = (currentMessageIndex + 1) % loaderMessages.length;
  }
}

// Каждые 2 секунды
setInterval(displayNextMessage, 2000);