// styleHandler.js
const { ipcRenderer } = require("electron")
const path = require("path")
const fs = require("fs")
const { loadConfig } = require("./utils/configLoader")
const { showScreen } = require("./uiNavigation")
const { getState } = require("./state")

function initStyleButtons(parsedStyles, styleButtonsContainer) {
  const config = loadConfig()
  const { selectedGenders } = getState()
  const stylesDir = config.stylesDir.replace("{{basePath}}", config.basePath)

  const uniqueStyles = parsedStyles.filter(
    (style, index, self) =>
      index === self.findIndex((s) => s.originalName === style.originalName)
  )
  styleButtonsContainer.innerHTML = ""

  uniqueStyles.forEach((style, index) => {
    const button = document.createElement("div")
    button.classList.add("button")
    button.setAttribute("data-style", style.originalName)

    const img = document.createElement("img")
    const sanitizedDisplayName = style.displayName.replace(/\s*\(.*?\)/g, "").replace(/\s+/g, "_")
    let imagePath = null
    for (const gender of selectedGenders) {
      const styleFolderPath = path.join(stylesDir, gender, style.originalName)
      const imageFileNamePrefix = `1${sanitizedDisplayName}`
      const extensions = [".jpg", ".png", ".jpeg"]
      for (const ext of extensions) {
        const possiblePath = path.join(styleFolderPath, imageFileNamePrefix + ext)
        if (fs.existsSync(possiblePath)) {
          imagePath = possiblePath
          break
        }
      }
      if (imagePath) break
    }

    img.src = imagePath || `${stylesDir}/default.png`
    img.alt = style.displayName

    const label = document.createElement("div")
    label.textContent = config.showStyleNames ? style.displayName : ""

    button.appendChild(img)
    button.appendChild(label)

    button.addEventListener("click", () => {
      const { setState } = require("./state")
      setState({ selectedStyle: style.originalName.replace(/\s*\(.*?\)/g, "") })
      showScreen("camera-screen")
    })

    button.style.animationDelay = `${index * 0.3}s`
    styleButtonsContainer.appendChild(button)
  })
}

function fetchStyles(styleButtonsContainer) {
  const { selectedGenders } = getState()
  ipcRenderer.invoke("get-styles", selectedGenders)
    .then((styles) => initStyleButtons(styles, styleButtonsContainer))
    .catch((error) => {
      console.error("Ошибка при загрузке стилей:", error)
      alert("Не удалось загрузить стили.")
    })
}

module.exports = { initStyleButtons, fetchStyles }