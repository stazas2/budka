// -*- coding: utf-8 -*-
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