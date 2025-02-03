// -*- coding: utf-8 -*-
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