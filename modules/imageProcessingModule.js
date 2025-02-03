// modules/imageProcessingModule.js
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const { ipcRenderer } = require("electron");
const configModule = require("./config");
const { config, basePath, basePathName, stylesDir, localhost, printLogo } = configModule;
const dom = require("./domElements");
const state = require("./state");
const uiNavigation = require("./uiNavigationModule");

async function sendDateToServer(imageData) {
  try {
    console.log("Sending image to server...");
    updateProgress(20);

    // Получаем фоновое изображение
    const backgroundImage = getRandomImageFromStyleFolder(state.nameDisplay);
    if (!backgroundImage) {
      throw new Error("Failed to get background image");
    }

    const data = {
      mode: config.mode || "style_sdxl",
      style: state.selectedStyle,
      return_s3_link: true,
      event: basePathName,
      logo_base64: fs.existsSync(printLogo) ? fs.readFileSync(printLogo, { encoding: "base64" }) : null,
      logo_pos_x: config.logo_pos_x,
      logo_pos_y: config.logo_pos_y,
      logo_scale: config.logoScale || 100,
      params: {
        Sex: Array.isArray(state.selectedGenders) && state.selectedGenders.length > 0 
          ? state.selectedGenders.join(", ") 
          : state.selectedGender,
        Face: imageData.split(",")[1],
        Fon: backgroundImage.split(",")[1]
      }
    };
    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${config.authToken}`,
      "Content-Type": "application/json"
    };
    const fetchOptions = {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data)
    };

    // Сохраняем лог запроса (для отладки)
    const logFilePath = path.join(basePath, "request_log.txt");
    fs.writeFileSync(
      logFilePath,
      `Headers: ${JSON.stringify(headers, null, 2)}\nData: ${JSON.stringify(data, null, 2)}`,
      "utf8"
    );
    console.log("Request log saved to:", logFilePath);

    // Отправляем запрос, используя URL из конфига
    const response = await fetch("http://your-server-address/api/handler/", fetchOptions)
      .catch(async () => {
        return await fetch("http://backup-server/api/handler/", fetchOptions);
      });
    if (!response.ok) throw new Error("Network error: " + response.status);
    const responseData = await response.json();
    console.log("Server response:", responseData);
    handleServerResponse(responseData);
  } catch (error) {
    console.error("Error in sendDateToServer:", error);
    throw error; // Пробрасываем ошибку для обработки в processImage
  }
}

async function generateQrCodeFromURL(url) {
  try {
    return await QRCode.toDataURL(url);
  } catch (err) {
    console.error("Error generating QR code:", err);
    throw err;
  }
}

async function handleServerResponse(responseData) {
  try {
    const imagesArray = Object.values(responseData)[0];
    if (imagesArray && imagesArray.length > 0) {
      const cleanedURL = imagesArray[0].replace("?image_url=", "").trim();
      dom.resultImage.src = cleanedURL;
      // Опционально: сохраняем полученное изображение с помощью saveUtils
      const saveUtils = require("../utils/saveUtils");
      await saveUtils.saveImageWithUtils("output", dom.resultImage.src);
      dom.resultImage.onload = () => {
        uiNavigation.showScreen("result-screen");
        require("./printingModule").updatePrintButtonVisibility();
      };
      try {
        const qrCodeData = await generateQrCodeFromURL(imagesArray[0]);
        dom.qrCodeImage.src = qrCodeData;
      } catch (error) {
        console.error("Error generating QR data:", error);
      }
    } else {
      alert("Не удалось получить обработанное изображение.");
      uiNavigation.showScreen("style-screen");
    }
  } catch (error) {
    console.error("Error in handleServerResponse:", error);
  }
}

function getRandomImageFromStyleFolder(style) {
  try {
    const gender = state.selectedGender;
    const styleFolderPath = path.join(stylesDir, gender, style);
    console.log("Getting background from:", styleFolderPath);

    if (!fs.existsSync(styleFolderPath)) {
      console.warn(`Style folder not found: ${styleFolderPath}`);
      return null;
    }

    // Получаем все файлы из папки стиля
    const files = fs.readdirSync(styleFolderPath)
      .filter(file => {
        const isImage = /\.(jpg|jpeg|png)$/i.test(file);
        // Исключаем превью (обычно первое изображение в папке)
        const isPreview = file === fs.readdirSync(styleFolderPath)[0];
        return isImage && !isPreview;
      });

    if (files.length === 0) {
      console.warn(`No background images found for style "${style}"`);
      return null;
    }

    // Используем индекс для последовательного перебора фонов
    if (!state.styleImageIndices[style]) {
      state.styleImageIndices[style] = 0;
    }

    const currentIndex = state.styleImageIndices[style];
    const fileName = files[currentIndex];
    // Обновляем индекс для следующего использования
    state.styleImageIndices[style] = (currentIndex + 1) % files.length;

    console.log(`Using background: ${fileName} (${currentIndex + 1}/${files.length})`);

    const mimeType = fileName.endsWith(".png") ? "png" : "jpeg";
    const imageData = fs.readFileSync(path.join(styleFolderPath, fileName), { encoding: "base64" });
    return `data:image/${mimeType};base64,${imageData}`;

  } catch (error) {
    console.error(`Error getting background for style "${style}":`, error);
    return null;
  }
}

async function processImage(imageData) {
  console.log("Starting image processing...");
  try {
    updateProgress(10);
    await sendDateToServer(imageData);
  } catch (error) {
    console.error("Image processing failed:", error);
    alert("Произошла ошибка при обработке изображения. Попробуйте еще раз.");
    uiNavigation.showScreen("style-screen");
  }
}

function updateProgress(percent) {
  console.log(`Processing progress: ${percent}%`);
  if (dom.progressBarFill) {
    dom.progressBarFill.style.width = `${percent}%`;
  }
  if (dom.progressPercentage) {
    dom.progressPercentage.textContent = `${percent}%`;
  }
}

module.exports = {
  sendDateToServer,
  generateQrCodeFromURL,
  handleServerResponse,
  getRandomImageFromStyleFolder,
  processImage
};
