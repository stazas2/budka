// modules/styleHandling.js
const fs = require("fs");
const path = require("path");
const state = require("./state");
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
    
    // Получаем стили для выбранного гендера
    const styles = getStylesForGender(state.selectedGender);
    console.log(`Found styles for gender ${state.selectedGender}:`, styles);
    
    styles.forEach(style => {
        console.log(`Creating button for style: ${style.id}`);
        const button = document.createElement("button");
        button.className = "style-button";
        button.dataset.style = style.id;
        
        // Берем первое изображение из папки стиля для превью
        const previewImage = getStylePreview(state.selectedGender, style.id);
        if (previewImage) {
            const img = document.createElement("img");
            img.src = previewImage;
            img.alt = style.label || style.id;
            button.appendChild(img);
        }
        
        if (config.showStyleNames) {
            const label = document.createElement("span");
            label.textContent = style.label || style.id;
            button.appendChild(label);
        }
        
        button.addEventListener("click", () => {
            console.log(`Selected style: ${style.id}`);
            state.selectedStyle = style.id;
            state.nameDisplay = style.id;
            uiNavigation.showScreen("camera-screen");
        });
        
        container.appendChild(button);
    });
    
    console.log("=== Style Initialization Complete ===");
}

function getStylesForGender(gender) {
    if (!gender) {
        console.error("Gender is undefined!");
        return [];
    }

    const genderPath = path.join(stylesDir, gender);
    console.log("Looking for styles in:", genderPath);
    
    if (!fs.existsSync(genderPath)) {
        console.error(`Gender directory not found: ${genderPath}`);
        return [];
    }
    
    try {
        return fs.readdirSync(genderPath)
            .filter(file => fs.statSync(path.join(genderPath, file)).isDirectory())
            .map(styleDir => ({
                id: styleDir,
                label: styleDir,
                path: path.join(genderPath, styleDir)
            }));
    } catch (error) {
        console.error("Error reading styles directory:", error);
        return [];
    }
}

function getStylePreview(gender, styleId) {
    const stylePath = path.join(stylesDir, gender, styleId);
    console.log("Getting preview from:", stylePath);
    
    try {
        const files = fs.readdirSync(stylePath)
            .filter(file => /\.(jpg|jpeg|png)$/i.test(file));
        
        if (files.length > 0) {
            return `${stylesDir}/${gender}/${styleId}/${files[0]}`;
        }
    } catch (error) {
        console.error(`Error getting preview for style ${styleId}:`, error);
    }
    return null;
}

module.exports = { initStyleButtons };
