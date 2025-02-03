const dom = require("./domElements");
const configModule = require("./config");
const { config } = configModule;
const state = require("./state");
const imageProcessingModule = require("./imageProcessingModule");
const uiNavigationModule = require("./uiNavigationModule");
const canonModule = require("./canonModule");

async function startCamera() {
  console.log('Starting camera...');
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
          width: { ideal: bestResolution.width },
          height: { ideal: bestResolution.height },
        },
      });
      state.videoStream = stream;
      dom.video.srcObject = stream;
      const metadataPromise = new Promise((resolve) => {
        if (dom.video.readyState >= 1) {
          state.cameraInitialized = true;
          console.log("Camera metadata already available");
          resolve();
        } else {
          dom.video.addEventListener('loadedmetadata', () => {
            state.cameraInitialized = true;
            console.log("Camera metadata loaded successfully");
            resolve();
          });
        }
      });
      await Promise.race([
        metadataPromise,
        new Promise((_, reject) =>
          setTimeout(() => {
            reject(new Error("Camera initialization timed out"));
          }, 5000)
        )
      ]);
      videoContainer.classList.remove("loading");
      console.log("Camera started successfully");
      await loadFiles();
      console.log('Files have been loaded');
    } catch (error) {
      console.error("Camera initialization failed:", error);
      videoContainer.classList.remove("loading");
      throw error;
    } finally {
      cameraBackButton.disabled = false;
    }
  } catch (err) {
    console.error('Error starting camera:', err);
    throw err;
  }
}

function loadFiles() {
  return new Promise((resolve, reject) => {
    console.log('Loading files...');
    resolve();
  });
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
  { width: 1280, height: 720 },
  { width: 640, height: 480 },
];

async function findBestResolution() {
  try {
    for (let resolution of resolutions) {
      try {
        // Используем "ideal", чтобы не требовать точного совпадения
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: resolution.width },
            height: { ideal: resolution.height },
          },
        });
        stream.getTracks().forEach((track) => track.stop());
        return resolution;
      } catch { }
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
