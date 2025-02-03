// modules/printingModule.js
const { ipcRenderer } = require("electron");
const dom = require("./domElements");
const configModule = require("./config");
const { config, translations } = configModule;
const state = require("./state");

function updatePrintButtonVisibility() {
    const printButton = dom.printPhotoButton;
    if (printButton) {
        console.log("Setting print button visibility");
        printButton.style.display = config.printButtonVisible ? "block" : "none";
        
        // Добавляем обработчик события только при первом показе кнопки
        if (!printButton.hasClickListener) {
            printButton.hasClickListener = true;
            printButton.addEventListener("click", handlePrintClick);
        }
    } else {
        console.warn("Print photo button not found");
    }
}

function handlePrintClick() {
    console.log("Print button clicked");
    const printButton = dom.printPhotoButton;
    
    if (printButton) {
        // Блокируем кнопку и меняем текст
        printButton.disabled = true;
        printButton.textContent = translations[config.language.current].printButtonTextWaiting;
        
        // Отправляем изображение на печать
        if (dom.resultImage && dom.resultImage.src) {
            console.log("Sending image to print");
            const imageData = dom.resultImage.src;
            const isLandscape = dom.resultImage.width > dom.resultImage.height;
            ipcRenderer.send("print-photo", { imageData, isLandscape });
        } else {
            console.error("No image found for printing");
        }
        
        // Восстанавливаем кнопку через 4 секунды
        setTimeout(() => {
            printButton.disabled = false;
            printButton.textContent = translations[config.language.current].printButtonText;
        }, 4000);
    }
}

if (dom.startOverButton) {
  dom.startOverButton.addEventListener("click", () => {
    const uiNavigation = require("./uiNavigationModule");
    state.selectedStyle = "";
    dom.resultImage.src = "";
    const cameraModule = require("./cameraModule");
    cameraModule.stopCamera();
    uiNavigation.showScreen("splash-screen");
    dom.qrCodeImage.style.display = "none";
    dom.qrCodeAgree.style.display = "initial";
  });
}

// Обработчик ответа от main процесса
ipcRenderer.on("print-photo-response", (event, success) => {
    console.log("Received print response:", success);
    if (success) {
        console.log("Printing completed successfully");
    } else {
        console.error("Printing failed");
        alert("Ошибка печати. Пожалуйста, проверьте принтер.");
    }
});

module.exports = { updatePrintButtonVisibility };
