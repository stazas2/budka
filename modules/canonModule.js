// modules/cameraModule.js
const state = require("./state");
const dom = require("./domElements");
const configModule = require("./config");
const { config } = configModule;
const imageProcessing = require("./imageProcessingModule");
const uiNavigation = require("./uiNavigationModule");
const canonModule = require("./canonModule");

async function startCamera() {
  console.log("Starting camera...");
  try {
    const videoContainer = document.querySelector(".video-container");
    videoContainer.classList.add("loading");
    if (config.cameraMode === "canon") {
      await canonModule.startLiveView();
    } else {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      state.videoStream = stream;
      dom.video.srcObject = stream;
      await new Promise((resolve, reject) => {
        if (dom.video.readyState >= 1) {
          state.cameraInitialized = true;
          resolve();
        } else {
          dom.video.addEventListener("loadedmetadata", () => {
            state.cameraInitialized = true;
            resolve();
          });
          setTimeout(() => reject(new Error("Camera initialization timeout")), 5000);
        }
      });
    }
    videoContainer.classList.remove("loading");
    console.log("Camera started successfully");
  } catch (error) {
    console.error("Camera initialization failed:", error);
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
    console.error("Error stopping camera:", error);
  }
}

async function takePicture() {
  try {
    if (config.cameraMode === "canon") {
      await canonModule.capture();
      if (!window.lastCapturedBlob) {
        console.warn("Нет доступного изображения от камеры Canon");
        return;
      }
      const imageUrl = URL.createObjectURL(window.lastCapturedBlob);
      const img = new Image();
      img.src = imageUrl;
      await new Promise((resolve) => (img.onload = resolve));
      const canvasElem = document.createElement("canvas");
      const ctx = canvasElem.getContext("2d");
      const rotationAngle = config.send_image_rotation || 0;
      if (rotationAngle === 90 || rotationAngle === 270) {
        canvasElem.width = img.height;
        canvasElem.height = img.width;
      } else {
        canvasElem.width = img.width;
        canvasElem.height = img.height;
      }
      ctx.save();
      ctx.translate(canvasElem.width / 2, canvasElem.height / 2);
      ctx.rotate((rotationAngle * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
      ctx.restore();
      const rotatedData = canvasElem.toDataURL("image/png");
      URL.revokeObjectURL(imageUrl);
      await imageProcessing.sendDateToServer(rotatedData);
    } else {
      const ctx = dom.canvas.getContext("2d");
      const rotationAngle = config.send_image_rotation || 0;
      if (rotationAngle === 90 || rotationAngle === 270) {
        dom.canvas.width = dom.video.videoHeight;
        dom.canvas.height = dom.video.videoWidth;
      } else {
        dom.canvas.width = dom.video.videoWidth;
        dom.canvas.height = dom.video.videoHeight;
      }
      ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
      ctx.save();
      ctx.translate(dom.canvas.width / 2, dom.canvas.height / 2);
      ctx.rotate((rotationAngle * Math.PI) / 180);
      ctx.drawImage(dom.video, -dom.video.videoWidth / 2, -dom.video.videoHeight / 2, dom.video.videoWidth, dom.video.videoHeight);
      ctx.restore();
      stopCamera();
      const imageData = dom.canvas.toDataURL("image/jpeg", 1.0);
      await imageProcessing.sendDateToServer(imageData);
    }
  } catch (error) {
    console.error("Error taking picture:", error);
    alert("Не удалось сделать снимок.");
    uiNavigation.showScreen("style-screen");
  }
}

module.exports = { startCamera, stopCamera, takePicture };
