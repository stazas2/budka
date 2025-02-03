// -*- coding: utf-8 -*-
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
      console.log("Выключаем EVF перед реконнектом...");
      await endLiveView();
      console.log("EVF выключен.");
    }
    console.log("Реконнект...");
    await fetch(`${localhost}/api/post/reconnect`, { method: "POST" });
    console.log("Реконнект успешен.");
    if (wasEvfActive) {
      console.log("Ждем 3 секунд перед включением EVF...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
      console.log("Включаем EVF после реконнекта...");
      await startLiveView();
      console.log("EVF включен.");
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