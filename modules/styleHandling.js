// modules/styleHandling.js
const fs = require("fs");
const path = require("path");
const state = require("./state");
const dom = require("./domElements");
const configModule = require("./config");
const { config, stylesDir } = configModule;
const uiNavigation = require("./uiNavigationModule");

function initStyleButtons() {
    console.log("=== Style Initialization Start ===");
    console.log("Styles directory:", stylesDir);
    
    const container = document.getElementById("style-buttons");
    if (!container) {
        console.error("Style buttons container not found!");
        return;
    }
    
    container.innerHTML = "";
    
    // Получаем список файлов из директории стилей
    const styles = [];
    try {
        const files = fs.readdirSync(stylesDir);
        console.log("Found style files:", files);
        
        files.forEach(file => {
            if (file.endsWith('.png') || file.endsWith('.jpg')) {
                styles.push({
                    id: file.split('.')[0],
                    label: file.split('.')[0],
                    image: file
                });
            }
        });
    } catch (error) {
        console.error("Error reading styles directory:", error);
    }
    
    console.log("Styles to display:", styles);
    
    styles.forEach(style => {
        console.log(`Creating button for style: ${style.id}`);
        const button = document.createElement("button");
        button.className = "style-button";
        button.dataset.style = style.id;
        
        const img = document.createElement("img");
        img.src = `${stylesDir}/${style.image}`;
        img.alt = style.label;
        
        img.onerror = () => {
            console.error(`Failed to load style image: ${img.src}`);
            img.style.display = 'none';
        };
        
        button.appendChild(img);
        button.addEventListener("click", async () => {
            console.log(`Selected style: ${style.id}`);
            state.selectedStyle = style.id;
            
            // Инициализируем камеру перед показом экрана
            try {
                if (config.cameraMode === "canon") {
                    const canonModule = require("./canonModule");
                    console.log("Initializing Canon camera...");
                    await canonModule.initLiveView();
                } else {
                    const cameraModule = require("./cameraModule");
                    console.log("Initializing webcam...");
                    await cameraModule.initCamera();
                }
            } catch (error) {
                console.error("Camera initialization error:", error);
            }
            
            uiNavigation.showScreen("camera-screen");
        });
        
        container.appendChild(button);
    });
    
    console.log("=== Style Initialization Complete ===");
}

module.exports = { initStyleButtons };
