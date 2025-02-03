// modules/genderHandling.js
const configModule = require("./config");
const { config } = configModule;
const uiNavigation = require("./uiNavigationModule");
const styleHandling = require("./styleHandling");

function initGenderButtons() {
    console.log("=== Gender Initialization Start ===");
    
    const container = document.getElementById("gender-buttons");
    if (!container) {
        console.error("Gender buttons container not found!");
        return;
    }
    
    // Очищаем контейнер
    container.innerHTML = "";
    
    // Проверяем конфигурацию гендеров
    if (!config.genders || !Array.isArray(config.genders)) {
        console.error("Invalid genders configuration:", config.genders);
        return;
    }
    
    config.genders.forEach(gender => {
        console.log(`Creating button for gender: ${gender.id}`);
        const button = document.createElement("button");
        button.className = "gender-button";
        button.dataset.gender = gender.id;
        
        const img = document.createElement("img");
        img.src = `./gender/${gender.image}`;
        img.alt = gender.label;
        
        // Добавляем обработку ошибок загрузки изображения
        img.onerror = () => {
            console.error(`Failed to load image: ${img.src}`);
            img.style.display = 'none';
        };
        
        button.appendChild(img);
        button.addEventListener("click", () => {
            console.log(`Selected gender: ${gender.id}`);
            styleHandling.initStyleButtons(); // Инициализируем стили перед переходом
            uiNavigation.showScreen("style-screen");
        });
        
        container.appendChild(button);
    });
    
    console.log("=== Gender Initialization Complete ===");
}

module.exports = { initGenderButtons };
