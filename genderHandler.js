// genderHandler.js
const { loadConfig } = require("./utils/configLoader")
const { showScreen } = require("./uiNavigation")
const { fetchStyles } = require("./styleHandler")
const { getState, setState } = require("./state")

function initGenderButtons(genderButtons, continueButton) {
  const config = loadConfig()
  continueButton.disabled = true
  continueButton.style.display = config.allowMultipleGenderSelection ? "block" : "none"

  genderButtons.forEach((item) => {
    item.addEventListener("click", () => {
      const gender = item.querySelector(".button").getAttribute("data-gender")
      const { selectedGenders } = getState()

      if (config.allowMultipleGenderSelection) {
        const index = selectedGenders.indexOf(gender)
        if (index === -1) {
          selectedGenders.push(gender)
          item.classList.add("selected")
          continueButton.disabled = false
        } else {
          selectedGenders.splice(index, 1)
          item.classList.remove("selected")
          continueButton.disabled = selectedGenders.length === 0
        }
      } else {
        genderButtons.forEach((btn) => btn.classList.remove("selected"))
        setState({ selectedGenders: [gender] })
        item.classList.add("selected")
        showScreen("style-screen")
        fetchStyles(document.getElementById("style-buttons"))
      }
    })
  })

  continueButton.addEventListener("click", () => {
    const { selectedGenders } = getState()
    if (selectedGenders.length > 0) {
      showScreen("style-screen")
      fetchStyles(document.getElementById("style-buttons"))
    }
  })
}

function setGenderImages() {
  const config = loadConfig()
  const allowedGenders = config.allowedGenders || ["man", "woman", "boy", "girl", "group"]
  allowedGenders.forEach((gender) => {
    const imgElement = document.getElementById(`gender-${gender}`)
    if (imgElement) imgElement.src = `./gender/${gender}.png`
  })
}

module.exports = { initGenderButtons, setGenderImages }