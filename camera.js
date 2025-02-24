// camera.js
const { loadConfig } = require("./utils/configLoader");
const { sendDateToServer } = require("./imageProcessor");
const { capture, getUniquePhotoBase64 } = require("./canon");
const { getState, setState } = require("./state");

async function startCamera() {
  const { video } = require("./scripts");
  try {
    console.log("Попытка инициализации камеры...");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1920, height: 1280 }
    });
    setState({ videoStream: stream, cameraInitialized: true });
    video.srcObject = stream;
    console.log("Камера успешно инициализирована");
  } catch (error) {
    console.error("Ошибка инициализации камеры:", error.message);
    setState({ cameraInitialized: false });
    throw error;
  }
}

function stopCamera() {
  const { videoStream } = getState();
  if (videoStream) {
    console.log("Остановка камеры...");
    videoStream.getTracks().forEach((track) => {
      track.stop();
      console.log("Трек камеры остановлен");
    });
    setState({ videoStream: null, cameraInitialized: false });
    console.log("Камера остановлена");
  } else {
    console.log("Камера уже остановлена или не инициализирована");
  }
}

async function takePicture(onProcessing, onResult, resultImage) {
  const { config, canvas, video } = require("./scripts");
  const state = getState();

  try {
    console.log("Попытка сделать снимок...");
    if (config.cameraMode === "canon") {
      const apiResponse = await capture();
      const imageData = await getUniquePhotoBase64(apiResponse, config.imagesFolder || './canon/SavedPhotos/', []);
      if (imageData) {
        await sendDateToServer(imageData, onProcessing, onResult, resultImage);
        console.log("Снимок успешно обработан (Canon)");
      } else {
        console.error("Не удалось получить данные снимка (Canon)");
      }
    } else {
      const context = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL("image/png");
      stopCamera();
      await sendDateToServer(imageData, onProcessing, onResult, resultImage);
      console.log("Снимок успешно обработан (PC)");
    }
  } catch (error) {
    console.error("Ошибка при съемке:", error.message);
    throw error;
  }
}

module.exports = { startCamera, stopCamera, takePicture };