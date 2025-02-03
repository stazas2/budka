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
    uiNavigation.showScreen("processing-screen");

    // Формируем объект запроса
    const data = {
      mode: config.mode || "Avatar",
      style: state.selectedStyle,
      return_s3_link: true,
      event: basePathName,
      logo_base64: fs.readFileSync(printLogo, { encoding: "base64" }),
      logo_pos_x: config.logo_pos_x,
      logo_pos_y: config.logo_pos_y,
      logo_scale: 100,
      params: {
        Sex: state.selectedGenders.join(", "),
        Face: imageData.split(",")[1],
        Fon: getRandomImageFromStyleFolder(state.nameDisplay)
          ? getRandomImageFromStyleFolder(state.nameDisplay).split(",")[1]
          : imageData.split(",")[1]
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

    // Отправляем запрос (используйте ваш URL API)
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
    const gender = state.selectedGenders[0];
    const styleFolderPath = path.join(stylesDir, gender, style);
    if (!fs.existsSync(styleFolderPath)) {
      console.warn(`Папка для стиля "${style}" и пола "${gender}" не существует.`);
      return null;
    }
    const files = fs
      .readdirSync(styleFolderPath)
      .filter((file) => /\.(jpg|jpeg|png)$/i.test(file));
    if (files.length === 0) {
      console.warn(`Не найдены изображения для стиля "${style}"`);
      return null;
    }
    if (!state.styleImageIndices[style]) {
      state.styleImageIndices[style] = 0;
    }
    const currentIndex = state.styleImageIndices[style];
    const fileName = files[currentIndex];
    state.styleImageIndices[style] = (currentIndex + 1) % files.length;
    const mimeType = fileName.endsWith(".png") ? "png" : "jpeg";
    const imageData = fs.readFileSync(path.join(styleFolderPath, fileName), { encoding: "base64" });
    return `data:image/${mimeType};base64,${imageData}`;
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
