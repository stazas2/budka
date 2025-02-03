// modules/styleHandling.js
const fs = require("fs");
const path = require("path");
const state = require("./state");
const dom = require("./domElements");
const configModule = require("./config");
const { config } = configModule;
const uiNavigation = require("./uiNavigationModule");

function initStyleButtons() {
    console.log("=== Style Initialization Start ===");
    
    const container = document.getElementById("style-buttons");
    if (!container) {
        console.error("Style buttons container not found!");
        return;
    }
    
    container.innerHTML = "";
    
    if (!config.styles || !Array.isArray(config.styles)) {
        console.error("Invalid styles configuration:", config.styles);
        return;
    }
    
    config.styles.forEach(style => {
        console.log(`Creating button for style: ${style.id}`);
        const button = document.createElement("button");
        button.className = "style-button";
        button.dataset.style = style.id;
        
        const img = document.createElement("img");
        img.src = `./styles/${style.image}`;
        img.alt = style.label;
        
        img.onerror = () => {
            console.error(`Failed to load style image: ${img.src}`);
            img.style.display = 'none';
        };
        
        button.appendChild(img);
        button.addEventListener("click", () => {
            console.log(`Selected style: ${style.id}`);
            uiNavigation.showScreen("camera-screen");
        });
        
        container.appendChild(button);
    });
    
    console.log("=== Style Initialization Complete ===");
}

module.exports = { initStyleButtons };
