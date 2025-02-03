module.exports = {
  get startButton() {
    return document.getElementById("start-button");
  },
  get backButtons() {
    return document.querySelectorAll(".back-button");
  },
  get logoContainer() {
    return document.getElementById("logo-container");
  },
  get resultImage() {
    return document.getElementById("result-image");
  },
  get modal() {
    return document.getElementById("qr-modal");
  },
  get qrCodeImage() {
    return document.getElementById("qr-code-img");
  },
  get qrCodeAgree() {
    return document.getElementById("qr-code-agree");
  },
  // Добавляем недостающие геттеры
  get styleButtonsContainer() {
    return document.getElementById("style-buttons");
  },
  get printPhotoButton() {
    return document.getElementById("print-photo");
  },
  get startOverButton() {
    return document.getElementById("start-over");
  },
  get genderButtonsContainer() {
    return document.getElementById("gender-buttons");
  },
  get video() {
    return document.getElementById("video");
  },
  get canvas() {
    return document.getElementById("canvas");
  },
  get countdownElement() {
    return document.getElementById("countdown");
  },
  get progressBar() {
    return document.getElementById("progress-bar");
  },
  get progressBarFill() {
    return document.getElementById("progress-bar-fill");
  },
  get progressPercentage() {
    return document.getElementById("progress-percentage");
  }
};
