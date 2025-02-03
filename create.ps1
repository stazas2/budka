# createFiles.ps1
# Этот скрипт создаёт все необходимые файлы в текущей директории с кодировкой UTF-8 без BOM.
# Убедитесь, что этот PS1-файл сохранён в UTF-8 без BOM!

# Функция для записи файла в UTF-8 без BOM
function Write-UTF8NoBOMFile {
    param (
        [Parameter(Mandatory=$true)] [string] $Path,
        [Parameter(Mandatory=$true)] [string] $Content
    )
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

# Создание необходимых директорий
New-Item -ItemType Directory -Force -Path "./modules" | Out-Null
New-Item -ItemType Directory -Force -Path "./utils" | Out-Null

# Массив файлов с путями и содержимым
$files = @(
    @{
        Path = "script.js"
        Content = @'
const { ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");

// Инициализируем модули (их код сам выполнится при require)
require("./modules/config");
require("./modules/domElements");
require("./modules/state");
require("./modules/styleHandling");
require("./modules/genderHandling");
require("./modules/cameraModule");
require("./modules/countdownModule");
require("./modules/imageProcessingModule");
require("./modules/uiNavigationModule");
require("./modules/printingModule");
require("./modules/localizationModule");
require("./modules/themeHandlingModule");
require("./modules/inactivityHandlerModule");
require("./modules/canonModule");
require("./modules/eventListeners");

// Применяем тему и настройки при старте
const themeHandling = require("./modules/themeHandlingModule");
const configModule = require("./modules/config");
themeHandling.applyTheme(configModule.config.theme || "light");
themeHandling.applySettings();
'@
    }
    @{
        Path = "modules/config.js"
        Content = @'
const fs = require("fs");
const path = require("path");
const iconv = require("iconv-lite");

const configPath = path.join(__dirname, "..", "config.json");
let config = {};
if (fs.existsSync(configPath)) {
  const buffer = fs.readFileSync(configPath);
  // Декодируем config.json, считанный в кодировке Windows-1251
  const configText = iconv.decode(buffer, "windows-1251");
  config = JSON.parse(configText);
}

const translations = require("../translations.json");

const basePath = config.basePath;
const basePathName = path.basename(basePath);
const baseDir = require("path").join(basePath, "SavedPhotos");
const stylesDir = config.stylesDir.replace("{{basePath}}", basePath);
const localhost = "http://localhost:5000";
const printLogo = config?.logoPath;

module.exports = {
  config,
  translations,
  basePath,
  basePathName,
  baseDir,
  stylesDir,
  localhost,
  printLogo
};
'@
    }
    @{
        Path = "modules/domElements.js"
        Content = @'
const fs = require("fs");
const configModule = require("./config");
const { config } = configModule;

const styleScreen = document.getElementById("style-screen");
const genderScreen = document.getElementById("gender-screen");
const cameraScreen = document.getElementById("camera-screen");
const processingScreen = document.getElementById("processing-screen");
const resultScreen = document.getElementById("result-screen");

const resultTitle = resultScreen.querySelector("h1");
resultTitle.style.display = "none";

const styleButtonsContainer = document.getElementById("style-buttons");
const countdownElement = document.getElementById("countdown");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const resultImage = document.getElementById("result-image");
const startOverButton = document.getElementById("start-over");
const printPhotoButton = document.getElementById("print-photo");
const progressBar = document.getElementById("progress-bar");
const progressBarFill = document.getElementById("progress-bar-fill");
const progressPercentage = document.getElementById("progress-percentage");
const backButtons = document.querySelectorAll(".back-button");
const startText = document.querySelector(".start-text");
const languageSwitcher = document.getElementById("language-switcher");
const genderButtons = document.querySelectorAll("#gender-buttons .button-row_item");
const modal = document.getElementById("qr-modal");
const showResultQrBtn = document.getElementById("show-qr-button");
const qrCodeAgree = document.getElementById("qr-code-agree");
const qrCodeImage = document.getElementById("qr-code-img");
const startButton = document.getElementById("start-button");
let continueButton = document.getElementById("gender-continue");
const brandLogo = document.getElementById("logo");

if (!fs.existsSync(brandLogo.src.replace(/^file:\/\/\//, ""))) {
  config.brandLogoPath = "";
}

if (config?.showResultQrBtn) {
  showResultQrBtn.style.display = "block";
} else {
  showResultQrBtn.style.display = "none";
}

module.exports = {
  styleScreen,
  genderScreen,
  cameraScreen,
  processingScreen,
  resultScreen,
  resultTitle,
  styleButtonsContainer,
  countdownElement,
  video,
  canvas,
  resultImage,
  startOverButton,
  printPhotoButton,
  progressBar,
  progressBarFill,
  progressPercentage,
  backButtons,
  startText,
  languageSwitcher,
  genderButtons,
  modal,
  showResultQrBtn,
  qrCodeAgree,
  qrCodeImage,
  startButton,
  continueButton,
  brandLogo
};
'@
    }
    @{
        Path = "modules/state.js"
        Content = @'
module.exports = {
  amountOfStyles: 0,
  selectedStyle: "",
  nameDisplay: "",
  videoStream: null,
  cameraInitialized: false,
  selectedGenders: [],
  styleImageIndices: {}
};
'@
    }
    @{
        Path = "modules/styleHandling.js"
        Content = @'
const fs = require("fs");
const path = require("path");
const { ipcRenderer } = require("electron");
const configModule = require("./config");
const { config, stylesDir } = configModule;
const dom = require("./domElements");
const state = require("./state");

function initStyleButtons(parsedStyles) {
  try {
    const uniqueStyles = parsedStyles.filter(
      (style, index, self) =>
        index === self.findIndex((s) => s.originalName === style.originalName)
    );
    console.log("Отфильтрованные стили: ", uniqueStyles);
    state.amountOfStyles = uniqueStyles.length;

    if (!dom.styleButtonsContainer) {
      console.error("Element style-buttons not found.");
      return;
    }
    dom.styleButtonsContainer.innerHTML = "";

    if (state.amountOfStyles > 1) {
      uniqueStyles.forEach((style, index) => {
        const button = document.createElement("div");
        button.classList.add("button");
        button.setAttribute("data-style", style.originalName);

        const img = document.createElement("img");
        const sanitizedDisplayName = style.displayName
          .replace(/\s*\(.*?\)/g, "")
          .replace(/\s+/g, "_")
          .replace(/[^\w\-]+/g, "");

        let imagePath = null;
        for (const gender of state.selectedGenders) {
          const styleFolderPath = path.join(stylesDir, gender, style.originalName);
          const imageFileNamePrefix = `1${sanitizedDisplayName}`;
          const extensions = [".jpg", ".png", ".jpeg"];
          for (const ext of extensions) {
            const possiblePath = path.join(styleFolderPath, imageFileNamePrefix + ext);
            if (fs.existsSync(possiblePath)) {
              imagePath = possiblePath;
              break;
            }
          }
          if (imagePath) break;
        }

        if (imagePath) {
          img.src = imagePath;
        } else {
          console.error(`Image not found for style: ${style.originalName}`);
          img.src = `${stylesDir}/default.png`;
        }
        img.alt = style.displayName;
        const label = document.createElement("div");
        const match = style.displayName.match(/\(([^)]+)\)/);

        if (config.showStyleNames) {
          label.textContent = match ? match[1] : style.displayName;
        } else {
          label.textContent = "";
        }

        button.appendChild(img);
        button.appendChild(label);
        console.log(`Style button created: ${style}`);

        button.addEventListener("click", () => {
          state.selectedStyle = style.originalName.replace(/\s*\(.*?\)/g, "");
          state.nameDisplay = style.originalName;
          require("./uiNavigationModule").showScreen("camera-screen");
          console.log(`Style selected: ${state.selectedStyle}`);
        });

        button.style.animationDelay = `${index * 0.3}s`;
        dom.styleButtonsContainer.appendChild(button);
      });
    } else if (state.amountOfStyles === 0) {
      alert(`No styles found for the ${state.selectedGenders}`);
      require("./uiNavigationModule").showScreen("gender-screen");
    } else {
      state.selectedStyle = uniqueStyles[0].originalName.replace(/\s*\(.*?\)/g, "");
      state.nameDisplay = uniqueStyles[0].originalName;
      require("./uiNavigationModule").showScreen("camera-screen");
      console.log(`Style selected: ${state.selectedStyle}`);
    }
  } catch (error) {
    console.error("Error in initStyleButtons:", error);
  }
}

function fetchStyles() {
  try {
    const { ipcRenderer } = require("electron");
    ipcRenderer
      .invoke("get-styles", state.selectedGenders)
      .then((styles) => {
        console.log("Получены стили:", styles);
        initStyleButtons(styles);
      })
      .catch((error) => {
        console.error("Ошибка при загрузке стили:", error);
        alert("Не удалось загрузить стили. Попробуйте позже.");
      });
  } catch (error) {
    console.error("Ошибка в fetchStyles:", error);
  }
}

module.exports = {
  initStyleButtons,
  fetchStyles
};
'@
    }
    @{
        Path = "modules/genderHandling.js"
        Content = @'
const dom = require("./domElements");
const configModule = require("./config");
const { config } = configModule;
const state = require("./state");
const styleHandling = require("./styleHandling");

function initGenderButtons() {
  try {
    dom.continueButton.disabled = true;
    dom.continueButton.style.display = config.allowMultipleGenderSelection ? "block" : "none";

    dom.genderButtons.forEach((item, index) => {
      item.style.animationDelay = `${index * 0.3}s`;
      item.classList.add("animate");
      item.replaceAllListeners?.("click");

      item.addEventListener("click", () => {
        const button = item.querySelector(".button");
        const gender = button.getAttribute("data-gender");

        if (config.allowMultipleGenderSelection) {
          const idx = state.selectedGenders.indexOf(gender);
          if (idx === -1) {
            state.selectedGenders.push(gender);
            item.classList.add("selected");
            dom.continueButton.disabled = false;
          } else {
            state.selectedGenders.splice(idx, 1);
            item.classList.remove("selected");
          }
          if (state.selectedGenders.length < 1) {
            dom.continueButton.disabled = true;
          }
          console.log("Selected genders:", state.selectedGenders);
        } else {
          dom.genderButtons.forEach((btn) => btn.classList.remove("selected"));
          state.selectedGenders = [gender];
          console.log(state.selectedGenders);
          require("./uiNavigationModule").showScreen("style-screen");
          styleHandling.fetchStyles();
        }
      });
    });

    dom.continueButton.addEventListener("click", () => {
      if (state.selectedGenders.length > 0) {
        require("./uiNavigationModule").showScreen("style-screen");
        styleHandling.fetchStyles();
      }
    });
  } catch (error) {
    console.error("Error in initGenderButtons:", error);
  }
}

function setGenderImages() {
  const allowedGenders = config.allowedGenders || ["man", "woman", "boy", "girl", "group"];
  const arrGenders = flattenGenders(allowedGenders);
  arrGenders.forEach((gender) => {
    const imgElement = document.getElementById(`gender-${gender}`);
    if (imgElement) {
      imgElement.src = `./gender/${gender}.png`;
    }
  });
  const allGenders = ["man", "woman", "boy", "girl", "group"];
  allGenders.forEach((gender) => {
    if (!arrGenders.includes(gender)) {
      const buttonElement = document.querySelector(`.button[data-gender="${gender}"]`);
      if (buttonElement && buttonElement.parentElement) {
        buttonElement.parentElement.style.display = "none";
      }
    }
  });
}

function flattenGenders(allowedGenders) {
  const genders = [];
  const flatten = (item) => {
    if (Array.isArray(item)) {
      item.forEach(flatten);
    } else if (typeof item === "string") {
      item.split(" ").forEach((g) => genders.push(g));
    }
  };
  allowedGenders.forEach(flatten);
  return [...new Set(genders)];
}

module.exports = {
  initGenderButtons,
  setGenderImages
};
'@
    }
    @{
        Path = "modules/cameraModule.js"
        Content = @'
const dom = require("./domElements");
const configModule = require("./config");
const { config } = configModule;
const state = require("./state");
const imageProcessingModule = require("./imageProcessingModule");
const uiNavigationModule = require("./uiNavigationModule");
const canonModule = require("./canonModule");

async function startCamera() {
  try {
    const liveViewContainer = document.getElementById("liveViewContainer");
    liveViewContainer.style.display = "none";
    const videoContainer = document.querySelector(".video-container");
    const cameraBackButton = document.querySelector("#camera-screen .back-button");
    cameraBackButton.disabled = true;
    try {
      videoContainer.classList.add("loading");
      const bestResolution = await findBestResolution();
      console.log(`Using resolution: ${bestResolution.width}x${bestResolution.height}`);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: bestResolution.width,
          height: bestResolution.height,
        },
      });
      state.videoStream = stream;
      dom.video.srcObject = stream;
      await Promise.race([
        new Promise((resolve) => {
          dom.video.onloadedmetadata = () => {
            state.cameraInitialized = true;
            console.log("Camera metadata loaded successfully");
            resolve();
          };
        }),
        new Promise((_, reject) =>
          setTimeout(() => {
            reject(new Error("Camera initialization timed out"));
          }, 3000)
        ),
      ]);
      videoContainer.classList.remove("loading");
      console.log("Camera started successfully");
    } catch (error) {
      console.error("Camera initialization failed:", error);
      videoContainer.classList.remove("loading");
      throw error;
    } finally {
      cameraBackButton.disabled = false;
    }
  } catch (error) {
    console.error("Error in startCamera:", error);
    throw error;
  }
}

function stopCamera() {
  try {
    if (state.videoStream) {
      state.videoStream.getTracks().forEach((track) => track.stop());
      dom.video.srcObject = null;
      state.videoStream = null;
      state.cameraInitialized = false;
      console.log("Camera stopped");
    }
  } catch (error) {
    console.error("Error in stopCamera:", error);
  }
}

async function takePicture() {
  let imageData = null;
  try {
    if (config.cameraMode === "canon") {
      try {
        await canonModule.capture();
        if (!window.lastCapturedBlob) {
          console.warn("No captured blob available; falling back to SavedPhotos.");
          return;
        }
        const imageUrl = URL.createObjectURL(window.lastCapturedBlob);
        const img = new Image();
        img.src = imageUrl;
        await new Promise((resolve) => (img.onload = resolve));
        const canvasElem = document.createElement("canvas");
        const context = canvasElem.getContext("2d");
        const rotationAngle = config.send_image_rotation || 0;
        if (rotationAngle === 90 || rotationAngle === 270) {
          canvasElem.width = img.height;
          canvasElem.height = img.width;
        } else {
          canvasElem.width = img.width;
          canvasElem.height = img.height;
        }
        context.save();
        context.translate(canvasElem.width / 2, canvasElem.height / 2);
        context.rotate((rotationAngle * Math.PI) / 180);
        context.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
        context.restore();
        const rotatedImageData = canvasElem.toDataURL("image/png");
        URL.revokeObjectURL(imageUrl);
        await imageProcessingModule.sendDateToServer(rotatedImageData);
        console.log("Canon photo captured and processed.");
      } catch (error) {
        console.error("Error in takePicture:", error);
        alert("Failed to take picture.");
        uiNavigationModule.showScreen("style-screen");
      }
    } else {
      const context = dom.canvas.getContext("2d");
      const rotationAngle = config.send_image_rotation || 0;
      if (rotationAngle === 90 || rotationAngle === 270) {
        dom.canvas.width = dom.video.videoHeight;
        dom.canvas.height = dom.video.videoWidth;
      } else {
        dom.canvas.width = dom.video.videoWidth;
        dom.canvas.height = dom.video.videoHeight;
      }
      context.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
      context.save();
      context.translate(dom.canvas.width / 2, dom.canvas.height / 2);
      context.rotate((rotationAngle * Math.PI) / 180);
      if (rotationAngle === 90 || rotationAngle === 270) {
        context.drawImage(dom.video, -dom.video.videoWidth / 2, -dom.video.videoHeight / 2, dom.video.videoWidth, dom.video.videoHeight);
      } else {
        context.drawImage(dom.video, -dom.canvas.width / 2, -dom.canvas.height / 2, dom.canvas.width, dom.canvas.height);
      }
      context.restore();
      stopCamera();
      imageData = dom.canvas.toDataURL("image/jpeg", 1.0);
      console.log("Picture taken successfully");
      try {
        const saveUtils = require("../utils/saveUtils");
        await saveUtils.saveImageWithUtils("input", imageData);
        console.log("Input image saved successfully");
      } catch (error) {
        console.error("Failed to save input image:", error);
      }
      await imageProcessingModule.sendDateToServer(imageData);
    }
  } catch (error) {
    console.error("Error in takePicture:", error);
    alert("Failed to take picture.");
    uiNavigationModule.showScreen("style-screen");
  }
}

const resolutions = [
  { width: 1920, height: 1280 },
  { width: 1080, height: 720 },
  { width: 640, height: 480 },
];

async function findBestResolution() {
  try {
    for (let resolution of resolutions) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { exact: resolution.width },
            height: { exact: resolution.height },
          },
        });
        stream.getTracks().forEach((track) => track.stop());
        return resolution;
      } catch {}
    }
    throw new Error("No supported resolutions found.");
  } catch (error) {
    console.error("Error in findBestResolution:", error);
    throw error;
  }
}

module.exports = {
  startCamera,
  stopCamera,
  takePicture,
  findBestResolution
};
'@
    }
    @{
        Path = "modules/countdownModule.js"
        Content = @'
const dom = require("./domElements");
const configModule = require("./config");
const { config } = configModule;
const cameraModule = require("./cameraModule");
const uiNavigationModule = require("./uiNavigationModule");
let countdownInterval;

function startCountdown() {
  try {
    const state = require("./state");
    if (!state.cameraInitialized && config.cameraMode === "pc") {
      console.log("Camera not ready, waiting for initialization...");
      dom.video.onloadedmetadata = () => {
        state.cameraInitialized = true;
        console.log("Camera initialized, starting countdown");
        beginCountdown();
      };
    } else {
      beginCountdown();
    }
  } catch (error) {
    console.error("Error in startCountdown:", error);
  }
}

function beginCountdown() {
  try {
    let countdown = config.prePhotoTimer || 5;
    const backButton = document.querySelector("#camera-screen .back-button");
    dom.countdownElement.textContent = countdown;
    countdownInterval = setInterval(async () => {
      countdown--;
      if (countdown > 0) {
        dom.countdownElement.textContent = countdown;
        backButton.style.opacity = "1";
        if (countdown <= 2 && backButton) {
          backButton.disabled = true;
          backButton.style.opacity = "0.5";
        }
      } else {
        clearInterval(countdownInterval);
        dom.countdownElement.textContent = "";
        await cameraModule.takePicture();
      }
    }, 1000);
  } catch (error) {
    console.error("Error in beginCountdown:", error);
  }
}

function clearCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
    dom.countdownElement.textContent = "";
  }
}

module.exports = {
  startCountdown,
  beginCountdown,
  clearCountdown
};
'@
    }
    @{
        Path = "modules/imageProcessingModule.js"
        Content = @'
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const { ipcRenderer } = require("electron");
const configModule = require("./config");
const { config, basePath, basePathName, stylesDir, localhost, printLogo } = configModule;
const dom = require("./domElements");
const state = require("./state");

async function sendDateToServer(imageData) {
  try {
    console.log("sending image to server");
    require("./uiNavigationModule").showScreen("processing-screen");

    let urlImage = null;
    if (config.cameraMode === "canon") {
      if (imageData) {
        urlImage = imageData.split(",")[1];
      } else {
        console.error("Изображение не найдено!");
        urlImage = null;
      }
    } else {
      urlImage = imageData.split(",")[1];
    }
    console.log("Image data (base64):", urlImage);

    const fonImage = getRandomImageFromStyleFolder(state.nameDisplay);
    const base64FonImage = fonImage ? fonImage.split(",")[1] : urlImage;

    const logoData = fs.readFileSync(printLogo, { encoding: "base64" });
    const base64Logo = `data:image/png;base64,${logoData}`.split(",")[1];

    const genders = state.selectedGenders.join(", ");

    const data = {
      mode: `${config?.mode}` || "Avatar",
      style: state.selectedStyle,
      return_s3_link: true,
      event: basePathName,
      logo_base64: base64Logo,
      logo_pos_x: config.logo_pos_x,
      logo_pos_y: config.logo_pos_y,
      logo_scale: 100,
      params: {
        Sex: genders,
        Face: urlImage,
        Fon: base64FonImage,
      },
    };

    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${config?.authToken}`,
      "Content-Type": "application/json",
    };

    const fetchOptions = {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data),
    };

    const logFilePath = path.join(basePath, "request_log.txt");
    fs.writeFileSync(
      logFilePath,
      `Headers: ${JSON.stringify(headers, null, 2)}\nData: ${JSON.stringify(data, null, 2)}`,
      "utf-8"
    );
    console.log("request log saved to:", logFilePath);

    dom.progressBar.style.display = "block";
    dom.progressBarFill.style.width = "100%";
    dom.progressPercentage.style.display = "none";

    fetch("http://90.156.158.209/api/handler/", fetchOptions)
      .then((response) => {
        console.log("HTTP response status:", response.status);
        if (!response.ok) throw new Error("Network error: " + response.status);
        return response.json();
      })
      .then((responseData) => {
        console.log("Data received from server:", responseData);
        handleServerResponse(responseData);
      })
      .catch(() => {
        fetch("http://85.95.186.114/api/handler/", fetchOptions)
          .then((response) => {
            console.log("HTTP response status:", response.status);
            if (!response.ok)
              throw new Error("Network error: " + response.status);
            return response.json();
          })
          .then((responseData) => {
            handleServerResponse(responseData);
          })
          .catch((error) => {
            console.error("Error sending data to backup server:", error);
            alert("Error sending the image to the server.");
            require("./uiNavigationModule").showScreen("style-screen");
          });
      });
  } catch (error) {
    console.error("Error in sendDateToServer:", error);
  }
}

async function generateQrCodeFromURL(url) {
  try {
    const qrCodeData = await QRCode.toDataURL(url);
    return qrCodeData;
  } catch (err) {
    console.error("Ошибка при генерации QR-кода:", err);
    throw err;
  }
}

async function handleServerResponse(responseData) {
  try {
    const imagesArray = Object.values(responseData)[0];
    if (imagesArray && imagesArray.length > 0) {
      const cleanedURL = imagesArray[0].replace("?image_url=", "").trim();
      dom.resultImage.src = cleanedURL;
      const saveUtils = require("../utils/saveUtils");
      await saveUtils.saveImageWithUtils("output", dom.resultImage.src);

      dom.resultImage.onload = () => {
        console.log("Image loaded successfully");
        console.log("Image dimensions: ", dom.resultImage.width, "x", dom.resultImage.height);
        require("./uiNavigationModule").showScreen("result-screen");
        require("./printingModule").updatePrintButtonVisibility();
      };

      try {
        const qrCodeData = await generateQrCodeFromURL(imagesArray[0]);
        dom.qrCodeImage.src = qrCodeData;
      } catch (error) {
        console.error("Error in getQrDate:", error);
      }
    } else {
      alert("Failed to retrieve processed image.");
      require("./uiNavigationModule").showScreen("style-screen");
    }
  } catch (error) {
    console.error("Error in handleServerResponse:", error);
  }
}

function getRandomImageFromStyleFolder(style) {
  try {
    const styleFolderPath = require("path").join(stylesDir, state.selectedGenders[0], style);

    if (!fs.existsSync(styleFolderPath)) {
      console.warn(`Folder for style "${style}" and gender "${state.selectedGenders[0]}" does not exist.`);
      return null;
    }

    console.log(`[Info] Reading folder: ${styleFolderPath}`);
    const cleanedStyle = style.replace(/\s*\(.*?\)/g, "");
    const excludeList = [
      `1${cleanedStyle}.jpg`,
      `1${cleanedStyle}.jpeg`,
      `1${cleanedStyle}.png`,
    ];

    const files = fs
      .readdirSync(styleFolderPath)
      .filter((file) => /\.(jpg|jpeg|png)$/i.test(file))
      .filter((file) => !excludeList.includes(file));

    if (files.length === 0) {
      console.warn(`No images found for style "${style}"`);
      return null;
    }

    if (!state.styleImageIndices[style]) {
      state.styleImageIndices[style] = 0;
    }

    const currentIndex = state.styleImageIndices[style];
    const fileName = files[currentIndex];
    state.styleImageIndices[style] = (currentIndex + 1) % files.length;

    console.log(`[Selected] Выбранный фон: ${fileName}`);
    const filePath = require("path").join(styleFolderPath, fileName);
    const imageData = fs.readFileSync(filePath, { encoding: "base64" });
    const mimeType = fileName.endsWith(".png") ? "image/png" : "image/jpeg";

    return `data:${mimeType};base64,${imageData}`;
  } catch (error) {
    console.error(`Error retrieving image for style "${style}":`, error);
    return null;
  }
}

module.exports = {
  sendDateToServer,
  generateQrCodeFromURL,
  handleServerResponse,
  getRandomImageFromStyleFolder
};
'@
    }
    @{
        Path = "modules/uiNavigationModule.js"
        Content = @'
const dom = require("./domElements");
const configModule = require("./config");
const { config } = configModule;
const state = require("./state");

async function showScreen(screenId) {
  try {
    console.log(`Switching to screen: ${screenId}`);
    const currentActive = document.querySelector(".screen.active");
    if (currentActive) currentActive.classList.remove("active");

    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
      targetScreen.classList.add("active");

      if (screenId === "style-screen") {
        dom.styleButtonsContainer.classList.add("hide-scrollbar");
        setTimeout(() => {
          dom.styleButtonsContainer.classList.remove("hide-scrollbar");
        }, 4000);
        const styleButtons = document.getElementById("style-buttons");
        if (styleButtons) styleButtons.scrollTop = 0;
      }

      if (screenId === "splash-screen") {
        state.selectedStyle = "";
        dom.resultImage.src = "";
        const cameraModule = require("./cameraModule");
        cameraModule.stopCamera();
        dom.modal.style.display = "none";
        dom.qrCodeImage.style.display = "none";
        dom.qrCodeAgree.style.display = "initial";
      }

      const backButton = targetScreen.querySelector(".back-button");
      if (backButton) {
        if (screenId === "splash-screen" || screenId === "processing-screen") {
          backButton.disabled = true;
          backButton.style.display = "block";
        } else if (screenId === "result-screen") {
          backButton.style.display = "none";
        } else {
          backButton.disabled = false;
          backButton.style.display = "block";
        }
      }

      if (screenId === "result-screen") {
        dom.resultTitle.style.display = "block";
      } else {
        dom.resultTitle.style.display = "none";
      }

      if (screenId === "camera-screen") {
        if (config.cameraMode === "canon") {
          dom.video.style.display = "none";
          const liveViewContainer = document.getElementById("liveViewContainer");
          liveViewContainer.style.display = "block";
          const countdownModule = require("./countdownModule");
          countdownModule.startCountdown();
        } else {
          const cameraModule = require("./cameraModule");
          cameraModule.startCamera()
            .then(() => {
              const countdownModule = require("./countdownModule");
              countdownModule.startCountdown();
            })
            .catch((err) => {
              alert("Unable to access the webcam.");
              console.log("Error: " + err);
              state.amountOfStyles === 1
                ? showScreen("gender-screen")
                : showScreen("style-screen");
            });
        }
      }
    } else {
      console.error(`Screen with ID "${screenId}" not found.`);
    }

    if (screenId !== "camera-screen") {
      const countdownModule = require("./countdownModule");
      countdownModule.clearCountdown();
    }

    const logoContainer = document.getElementById("logo-container");
    if (screenId === "camera-screen" || screenId === "result-screen") {
      logoContainer.style.display = "none";
    } else {
      if (config.brandLogoPath) {
        logoContainer.style.display = "block";
      }
    }
  } catch (error) {
    console.error(`Error in showScreen (${screenId}):`, error);
  }
}

module.exports = {
  showScreen
};
'@
    }
    @{
        Path = "modules/printingModule.js"
        Content = @'
const { ipcRenderer } = require("electron");
const dom = require("./domElements");
const configModule = require("./config");
const { config, translations } = configModule;
const state = require("./state");

function updatePrintButtonVisibility() {
  if (config.printButtonVisible) {
    dom.printPhotoButton.style.display = "block";
  } else {
    dom.printPhotoButton.style.display = "none";
  }
}

if (dom.startOverButton) {
  dom.startOverButton.addEventListener("click", () => {
    const uiNavigationModule = require("./uiNavigationModule");
    state.selectedStyle = "";
    dom.resultImage.src = "";
    const cameraModule = require("./cameraModule");
    cameraModule.stopCamera();
    uiNavigationModule.showScreen("splash-screen");
    dom.qrCodeImage.style.display = "none";
    dom.qrCodeAgree.style.display = "initial";
  });
}

if (dom.printPhotoButton) {
  dom.printPhotoButton.addEventListener("click", () => {
    dom.printPhotoButton.disabled = true;
    dom.printPhotoButton.textContent =
      translations[config.language.current].printButtonTextWaiting;
    setTimeout(() => {
      dom.printPhotoButton.disabled = false;
      dom.printPhotoButton.textContent =
        translations[config.language.current].printButtonText;
    }, 4000);

    if (dom.resultImage && dom.resultImage.src) {
      const imageData = dom.resultImage.src;
      const isLandscape = dom.resultImage.width > dom.resultImage.height;
      console.log(`isLandscape: ${isLandscape}: ${dom.resultImage.width}x${dom.resultImage.height}`);
      ipcRenderer.send("print-photo", {
        imageData: imageData,
        isLandscape,
      });
    } else {
      console.error("Image not found for printing.");
    }
  });
}

ipcRenderer.on("print-photo-response", (event, success) => {
  if (success) {
    console.log("Print job completed successfully.");
  } else {
    console.error("Print job failed.");
  }
});

module.exports = {
  updatePrintButtonVisibility
};
'@
    }
    @{
        Path = "modules/localizationModule.js"
        Content = @'
const dom = require("./domElements");
const configModule = require("./config");
const { config, translations } = configModule;
const printingModule = require("./printingModule");

function updateTexts() {
  try {
    const texts = translations[config.language.current];
    if (!texts) return;

    const screenTitles = {
      "splash-screen": texts.welcomeMessage,
      "style-screen": texts.styleScreenTitle,
      "gender-screen": texts.genderScreenTitle,
      "camera-screen": texts.cameraScreenTitle,
      "processing-screen": texts.processingScreenTitle,
      "result-screen": texts.resultScreenTitle,
    };

    for (const [screenId, titleText] of Object.entries(screenTitles)) {
      const screen = document.getElementById(screenId);
      if (screen) {
        const titleElement = screen.querySelector("h1");
        if (titleElement) {
          titleElement.textContent = titleText;
        }
      }
    }

    if (dom.startButton) {
      dom.startButton.textContent = texts.startButtonText;
    }

    if (dom.continueButton) {
      dom.continueButton.textContent = texts.continueButtonText;
    }

    if (dom.showResultQrBtn) {
      dom.showResultQrBtn.textContent = texts.showResultQrBtn;
    }

    const backButtons = document.querySelectorAll(".back-button");
    backButtons.forEach((button) => {
      button.textContent = texts.backButtonText;
    });

    if (dom.printPhotoButton) {
      dom.printPhotoButton.textContent = texts.printButtonText;
    }

    if (dom.startOverButton) {
      dom.startOverButton.textContent = texts.startOverButtonText;
    }

    const loaderText = document.getElementsByClassName("loader-text");
    if (loaderText) {
      [...loaderText].forEach((el) => (el.textContent = texts.loaderText));
    }

    const genderButtons = document.querySelectorAll("#gender-buttons .button");
    genderButtons.forEach((button) => {
      const genderKey = button.getAttribute("data-gender");
      button.textContent = texts.genders[genderKey];
    });

    if (dom.languageSwitcher) {
      dom.languageSwitcher.textContent = config.language.current === "ru" ? "KK" : "RU";
      dom.languageSwitcher.style.display = config.language?.showSwitcher ? "block" : "none";
    }

    printingModule.updatePrintButtonVisibility();
  } catch (error) {
    console.error("Error in updateTexts:", error);
  }
}

module.exports = {
  updateTexts
};
'@
    }
    @{
        Path = "modules/themeHandlingModule.js"
        Content = @'
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
          ? `url("${config.lightTheme.backgroundImage.replace(/\\\\/g, "/")}")`
          : `url("${config.darkTheme.backgroundImage.replace(/\\\\/g, "/")}")`
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
'@
    }
    @{
        Path = "modules/inactivityHandlerModule.js"
        Content = @'
const configModule = require("./config");
const { config } = configModule;
const uiNavigationModule = require("./uiNavigationModule");
const state = require("./state");
const dom = require("./domElements");

const inactivityTimeout = config.inactivityTimeout || 60000;
let inactivityTimer;
function resetInactivityTimer() {
  try {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      uiNavigationModule.showScreen("splash-screen");
      state.selectedStyle = "";
      dom.resultImage.src = "";
      const cameraModule = require("./cameraModule");
      cameraModule.stopCamera();
    }, inactivityTimeout);
  } catch (error) {
    console.error("Error in resetInactivityTimer:", error);
  }
}
["click", "mousemove", "keypress", "touchstart"].forEach((event) => {
  document.addEventListener(event, resetInactivityTimer);
});
resetInactivityTimer();

module.exports = {
  resetInactivityTimer
};
'@
    }
    @{
        Path = "modules/canonModule.js"
        Content = @'
const configModule = require("./config");
const { config, localhost } = configModule;
const dom = require("./domElements");
const fs = require("fs");
const path = require("path");

let liveViewInterval;
let lastLiveViewUpdate = null;
let isFetchingLiveView = false;

const noResponseWarning = document.createElement("p");
noResponseWarning.style.color = "red";
noResponseWarning.textContent = "Давно не было ответа от Live View.";
noResponseWarning.style.display = "none";

const liveViewImage = document.getElementById("liveViewImage");
const liveViewContainer = document.getElementById("liveViewContainer");

let cameraMode = config.cameraMode;
if (!cameraMode) {
  cameraMode = "pc";
}
let isEvf = config.isEvf;

function applyRotationStyles() {
  try {
    const videoElement = document.getElementById("video");
    const resultImage = document.getElementById("result-image");
    if (videoElement) {
      videoElement.style.transform = `rotate(${config.camera_rotation}deg)`;
      console.log(`Camera rotation set to ${config.camera_rotation} degrees.`);
    }
    if (resultImage) {
      const finalRotation = (config.final_image_rotation !== undefined) ? config.final_image_rotation : 0;
      resultImage.style.transform = `rotate(${finalRotation}deg)`;
      console.log(`Final image rotation set to ${finalRotation} degrees.`);
    }
  } catch (error) {
    console.error("Error in applyRotationStyles:", error);
  }
}
applyRotationStyles();

async function startLiveView() {
  isEvf = true;
  try {
    await fetch(`${localhost}/api/post/evf/start`, { method: "POST" });
    liveViewInterval = setInterval(updateLiveView, 100);
    lastLiveViewUpdate = Date.now();
    noResponseWarning.style.display = "none";
  } catch (error) {
    console.error("Ошибка при включении Live View:", error);
  }
}

async function endLiveView() {
  isEvf = false;
  try {
    await fetch(`${localhost}/api/post/evf/end`, { method: "POST" });
    clearInterval(liveViewInterval);
    liveViewImage.style.display = "none";
    noResponseWarning.style.display = "none";
  } catch (error) {
    console.error("Ошибка при выключении Live View:", error);
  }
}

async function updateLiveView() {
  if (isFetchingLiveView) return;
  isFetchingLiveView = true;
  try {
    const response = await fetch(`${localhost}/api/get/live-view`);
    if (response.ok) {
      const blob = await response.blob();
      liveViewImage.src = URL.createObjectURL(blob);
      liveViewImage.style.display = "block";
      liveViewImage.onload = () => URL.revokeObjectURL(liveViewImage.src);
      lastLiveViewUpdate = Date.now();
      noResponseWarning.style.display = "none";
      window.lastCapturedBlob = blob;
    }
  } catch (error) {
    console.error("Ошибка live view:", error);
  } finally {
    isFetchingLiveView = false;
  }
}

async function reconnect() {
  const wasEvfActive = isEvf;
  try {
    if (wasEvfActive) {
      console.log("Выкладываем EVF перед реконнектом...");
      await endLiveView();
      console.log("EVF выложен.");
    }
    console.log("Реконнект...");
    await fetch(`${localhost}/api/post/reconnect`, { method: "POST" });
    console.log("Реконнект успешен.");
    if (wasEvfActive) {
      console.log("Здесь 3 секунды перед включением EVF...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
      console.log("Включаем EVF после реконнекта...");
      await startLiveView();
      console.log("EVF выложен.");
    }
  } catch (error) {
    console.error("Ошибка реконнекта:", error);
  }
}

async function capture() {
  try {
    const response = await fetch(`${localhost}/api/post/capture-image/capture`, {
      method: "POST",
    });
    const data = await response.json();
    if (response.ok) {
      console.log("Снимок сделан успешно");
    } else {
      console.log(`Ошибка: ${data.error}`);
    }
  } catch (error) {
    console.error("Ошибка:", error);
  }
}

function getLatestImage(folderPath) {
  try {
    const files = fs
      .readdirSync(folderPath)
      .map((file) => ({
        name: file,
        time: fs.statSync(path.join(folderPath, file)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);
    if (files.length === 0) {
      console.error("Папка пуста.");
      return null;
    }
    return path.join(folderPath, files[0].name);
  } catch (error) {
    console.error("Ошибка при поиске файлов:", error);
    return null;
  }
}

module.exports = {
  startLiveView,
  endLiveView,
  updateLiveView,
  reconnect,
  capture,
  getLatestImage
};
'@
    }
    @{
        Path = "modules/eventListeners.js"
        Content = @'
const dom = require("./domElements");
const localizationModule = require("./localizationModule");
const genderHandling = require("./genderHandling");
const uiNavigationModule = require("./uiNavigationModule");
const themeHandlingModule = require("./themeHandlingModule");
const state = require("./state");

document.addEventListener("DOMContentLoaded", () => {
  const configModule = require("./config");
  const { config } = configModule;
  if (config.cameraMode !== "canon") {
    uiNavigationModule.showScreen("splash-screen");
  }
  localizationModule.updateTexts();
  genderHandling.initGenderButtons();
  genderHandling.setGenderImages();
});

dom.backButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const currentScreen = document.querySelector(".screen.active");
    switch (currentScreen.id) {
      case "style-screen":
        state.selectedGenders = [];
        document.querySelectorAll("#gender-buttons .button-row_item").forEach((item) => {
          item.classList.remove("selected");
        });
        uiNavigationModule.showScreen("gender-screen");
        break;
      case "gender-screen":
        state.selectedGenders = [];
        document.querySelectorAll("#gender-buttons .button-row_item").forEach((item) => {
          item.classList.remove("selected");
        });
        uiNavigationModule.showScreen("splash-screen");
        break;
      case "camera-screen":
        if (!button.disabled && state.amountOfStyles > 1) {
          const countdownModule = require("./countdownModule");
          countdownModule.clearCountdown();
          dom.countdownElement.textContent = "";
          const cameraModule = require("./cameraModule");
          cameraModule.stopCamera();
          uiNavigationModule.showScreen("style-screen");
        } else if (state.amountOfStyles === 1) {
          state.selectedGenders = [];
          document.querySelectorAll("#gender-buttons .button-row_item").forEach((item) => {
            item.classList.remove("selected");
          });
          uiNavigationModule.showScreen("gender-screen");
        }
        break;
    }
  });
});

window.addEventListener("resize", handleOrientationChange);
function handleOrientationChange() {
  try {
    if (window.innerHeight > window.innerWidth) {
      console.log("Портретная ориентация");
    } else {
      console.log("Ландшафтная ориентация");
    }
  } catch (error) {
    console.error("Error in handleOrientationChange:", error);
  }
}
handleOrientationChange();

let loaderMessages = require("./config").translations[require("./config").config.language.current].loaderMessages || [];
let currentMessageIndex = 0;
function createFloatingText(message) {
  const textElement = document.createElement("div");
  const progressBarRect = dom.progressBar.getBoundingClientRect();
  textElement.className = "floating-text";
  textElement.innerText = message;
  const randomX = Math.random() * 35 + 25;
  const xPosition = (progressBarRect.width * randomX) / 100;
  const randomY = Math.random() * 40 - 20;
  textElement.style.position = "absolute";
  textElement.style.left = `${progressBarRect.left / 1.2 + xPosition}px`;
  textElement.style.bottom = `${progressBarRect.bottom + randomY - window.innerHeight}px`;
  const processingScreen = document.getElementById("processing-screen");
  processingScreen.appendChild(textElement);
  setTimeout(() => {
    processingScreen.removeChild(textElement);
  }, 2000);
}
function displayNextMessage() {
  const processingScreen = document.getElementById("processing-screen");
  if (processingScreen.classList.contains("active")) {
    if (loaderMessages.length > 0) {
      createFloatingText(loaderMessages[currentMessageIndex]);
      currentMessageIndex = (currentMessageIndex + 1) % loaderMessages.length;
    }
  }
}
setInterval(displayNextMessage, 2000);

const customCheckboxQr = document.querySelector(".custom-checkbox-qr");
if (customCheckboxQr) {
  customCheckboxQr.addEventListener("click", function (event) {
    dom.qrCodeImage.style.display = "none";
    showModal();
  });
}
function showModal() {
  if (dom.modal) {
    dom.modal.style.display = "flex";
  }
}
if (dom.modal) {
  dom.modal.addEventListener("click", function (event) {
    if (event.target === dom.modal || event.target.classList.contains("close-modal")) {
      dom.modal.style.display = "none";
    }
  });
}
if (dom.showResultQrBtn) {
  dom.showResultQrBtn.addEventListener("click", () => {
    dom.qrCodeAgree.style.display = "none";
    dom.qrCodeImage.style.display = "initial";
    showModal();
  });
}
const fullscreenToggleButton = document.getElementById("fullscreen-toggle");
let clickCount = 0;
let clickTimer;
fullscreenToggleButton.addEventListener("click", function () {
  clickCount++;
  if (clickCount === 3) {
    clickCount = 0;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Full-screen error: ${err.message}`);
      });
      clearTimeout(clickTimer);
    } else {
      document.exitFullscreen();
      clearTimeout(clickTimer);
    }
  }
  if (!clickTimer) {
    clickTimer = setTimeout(() => {
      clickCount = 0;
    }, 500);
  } else {
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => {
      clickCount = 0;
    }, 500);
  }
});
'@
    }
    @{
        Path = "utils/configLoader.js"
        Content = @'
module.exports.loadConfig = function() {
    const fs = require("fs");
    const path = require("path");
    const configPath = path.join(__dirname, "..", "config.json");
    if(fs.existsSync(configPath)){
         return JSON.parse(fs.readFileSync(configPath, "utf8"));
    }
    return {};
};
'@
    }
    @{
        Path = "utils/saveUtils.js"
        Content = @'
module.exports.saveImageWithUtils = async function(prefix, imageData) {
    const fs = require("fs");
    const path = require("path");
    const filePath = path.join(__dirname, "..", "SavedImages", `${prefix}_${Date.now()}.jpg`);
    fs.writeFileSync(filePath, imageData.split(",")[1], "base64");
    return filePath;
};
'@
    }
    @{
        Path = "config.json"
        Content = @'
{
  "basePath": "./",
  "stylesDir": "./styles",
  "logoPath": "./logo.png",
  "brandLogoPath": "./brandLogo.png",
  "mainLogoScale": 1,
  "camera_rotation": 0,
  "cameraMode": "pc",
  "isEvf": false,
  "showResultQrBtn": true,
  "allowMultipleGenderSelection": false,
  "prePhotoTimer": 5,
  "mode": "Avatar",
  "authToken": "dummyToken",
  "logo_pos_x": 0,
  "logo_pos_y": 0,
  "printButtonVisible": true,
  "language": {
    "current": "ru",
    "showSwitcher": true
  },
  "lightTheme": {
    "backgroundColor": "#fff",
    "backgroundImage": "light-bg.png",
    "lightTextColor": "#000"
  },
  "darkTheme": {
    "backgroundColor": "#000",
    "backgroundImage": "dark-bg.png",
    "darkTextColor": "#fff"
  },
  "animationEnabled": false,
  "animatedBackground": "",
  "backdropBlur": "0px",
  "allowedGenders": ["man", "woman", "boy", "girl", "group"],
  "visibilityAgree": true
}
'@
    }
    @{
        Path = "translations.json"
        Content = @'
{
  "ru": {
    "welcomeMessage": "Добро пожаловать",
    "styleScreenTitle": "Выберите стиль",
    "genderScreenTitle": "Выберите пол",
    "cameraScreenTitle": "Камера",
    "processingScreenTitle": "Обработка",
    "resultScreenTitle": "Результат",
    "startButtonText": "Начать",
    "continueButtonText": "Продолжить",
    "showResultQrBtn": "Показать QR",
    "backButtonText": "Назад",
    "printButtonText": "Печать",
    "printButtonTextWaiting": "Ожидание...",
    "startOverButtonText": "Начать заново",
    "loaderText": "Загрузка...",
    "loaderMessages": ["Загрузка 1", "Загрузка 2"],
    "genders": {
      "man": "Мужчина",
      "woman": "Женщина",
      "boy": "Мальчик",
      "girl": "Девочка",
      "group": "Группа"
    }
  }
}
'@
    }
)

foreach ($file in $files) {
    $dir = Split-Path $file.Path
    if ($dir -ne "") {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
    Write-UTF8NoBOMFile -Path $file.Path -Content $file.Content
}
