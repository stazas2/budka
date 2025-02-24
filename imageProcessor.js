// imageProcessor.js
const { loadConfig } = require("./utils/configLoader");
const { getState } = require("./state");
const fs = require("fs");
const path = require("path");

async function sendDateToServer(imageData, onProcessing, onResult, resultImage) {
  const config = loadConfig();
  const { selectedStyle, selectedGenders } = getState();

  // Вызываем коллбэк для показа экрана обработки
  onProcessing();

  const logoData = fs.readFileSync(config.logoPath, { encoding: "base64" });
  const data = {
    mode: config?.mode || "Avatar",
    style: selectedStyle,
    return_s3_link: true,
    event: path.basename(config.basePath),
    logo_base64: logoData,
    logo_pos_x: config.logo_pos_x,
    logo_pos_y: config.logo_pos_y,
    logo_scale: config.logo_scale,
    params: {
      Sex: selectedGenders.join(", "),
      Face: imageData.split(",")[1],
      Fon: imageData.split(",")[1],
    }
  };

  console.log("Отправляемые данные:", JSON.stringify(data, null, 2)); // Логирование данных для отладки

  try {
    const response = await fetch("http://90.156.158.209/api/handler", { // Исправлен URL
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${config?.authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text(); // Получаем текст ошибки от сервера
      throw new Error(`Network error: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log("Ответ сервера:", responseData); // Логирование ответа
    const imageUrl = Object.values(responseData)[0][0].replace("?image_url=", "").trim();
    resultImage.src = imageUrl;

    // Вызываем коллбэк для показа экрана результата
    onResult();
  } catch (error) {
    console.error("Ошибка при отправке данных на сервер:", error.message);
    throw error;
  }
}

module.exports = { sendDateToServer };