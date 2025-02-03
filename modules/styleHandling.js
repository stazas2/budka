const fs = require("fs");
const path = require("path");
const { ipcRenderer } = require("electron");
const configModule = require("./config");
const { config, stylesDir } = configModule;
const dom = require("./domElements");
const state = require("./state");

function initStyleButtons(parsedStyles) {
  try {
    const uniqueStyles = parsedStyles.filter(
      (style, index, self) =>
        index === self.findIndex((s) => s.originalName === style.originalName)
    );
    console.log("Отфильтрованные стили: ", uniqueStyles);
    state.amountOfStyles = uniqueStyles.length;

    if (!dom.styleButtonsContainer) {
      console.error("Element style-buttons not found.");
      return;
    }
    dom.styleButtonsContainer.innerHTML = "";

    if (state.amountOfStyles > 1) {
      uniqueStyles.forEach((style, index) => {
        const button = document.createElement("div");
        button.classList.add("button");
        button.setAttribute("data-style", style.originalName);

        const img = document.createElement("img");
        const sanitizedDisplayName = style.displayName
          .replace(/\s*\(.*?\)/g, "")
          .replace(/\s+/g, "_")
          .replace(/[^\w\-]+/g, "");

        let imagePath = null;
        for (const gender of state.selectedGenders) {
          const styleFolderPath = path.join(stylesDir, gender, style.originalName);
          const imageFileNamePrefix = `1${sanitizedDisplayName}`;
          const extensions = [".jpg", ".png", ".jpeg"];
          for (const ext of extensions) {
            const possiblePath = path.join(styleFolderPath, imageFileNamePrefix + ext);
            if (fs.existsSync(possiblePath)) {
              imagePath = possiblePath;
              break;
            }
          }
          if (imagePath) break;
        }

        if (imagePath) {
          img.src = imagePath;
        } else {
          console.error(`Image not found for style: ${style.originalName}`);
          img.src = `${stylesDir}/default.png`;
        }
        img.alt = style.displayName;
        const label = document.createElement("div");
        const match = style.displayName.match(/\(([^)]+)\)/);

        if (config.showStyleNames) {
          label.textContent = match ? match[1] : style.displayName;
        } else {
          label.textContent = "";
        }

        button.appendChild(img);
        button.appendChild(label);
        console.log(`Style button created: ${style}`);

        button.addEventListener("click", () => {
          state.selectedStyle = style.originalName.replace(/\s*\(.*?\)/g, "");
          state.nameDisplay = style.originalName;
          require("./uiNavigationModule").showScreen("camera-screen");
          console.log(`Style selected: ${state.selectedStyle}`);
        });

        button.style.animationDelay = `${index * 0.3}s`;
        dom.styleButtonsContainer.appendChild(button);
      });
    } else if (state.amountOfStyles === 0) {
      alert(`No styles found for the ${state.selectedGenders}`);
      require("./uiNavigationModule").showScreen("gender-screen");
    } else {
      state.selectedStyle = uniqueStyles[0].originalName.replace(/\s*\(.*?\)/g, "");
      state.nameDisplay = uniqueStyles[0].originalName;
      require("./uiNavigationModule").showScreen("camera-screen");
      console.log(`Style selected: ${state.selectedStyle}`);
    }
  } catch (error) {
    console.error("Error in initStyleButtons:", error);
  }
}

function fetchStyles() {
  try {
    const { ipcRenderer } = require("electron");
    ipcRenderer
      .invoke("get-styles", state.selectedGenders)
      .then((styles) => {
        console.log("Показаны стили:", styles);
        initStyleButtons(styles);
      })
      .catch((error) => {
        console.error("Ошибка при загрузке стилей:", error);
        alert("Не удалось загрузить стили. Попробуйте позже.");
      });
  } catch (error) {
    console.error("Ошибка в fetchStyles:", error);
  }
}

module.exports = {
  initStyleButtons,
  fetchStyles
};