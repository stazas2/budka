// -*- coding: utf-8 -*-
const dom = require("./domElements");
const configModule = require("./config");
const { config } = configModule;
const state = require("./state");
const styleHandling = require("./styleHandling");

function initGenderButtons() {
  try {
    dom.continueButton.disabled = true;
    dom.continueButton.style.display = config.allowMultipleGenderSelection ? "block" : "none";

    dom.genderButtons.forEach((item, index) => {
      item.style.animationDelay = `${index * 0.3}s`;
      item.classList.add("animate");
      item.replaceAllListeners?.("click");

      item.addEventListener("click", () => {
        const button = item.querySelector(".button");
        const gender = button.getAttribute("data-gender");

        if (config.allowMultipleGenderSelection) {
          const idx = state.selectedGenders.indexOf(gender);
          if (idx === -1) {
            state.selectedGenders.push(gender);
            item.classList.add("selected");
            dom.continueButton.disabled = false;
          } else {
            state.selectedGenders.splice(idx, 1);
            item.classList.remove("selected");
          }
          if (state.selectedGenders.length < 1) {
            dom.continueButton.disabled = true;
          }
          console.log("Selected genders:", state.selectedGenders);
        } else {
          dom.genderButtons.forEach((btn) => btn.classList.remove("selected"));
          state.selectedGenders = [gender];
          console.log(state.selectedGenders);
          require("./uiNavigationModule").showScreen("style-screen");
          styleHandling.fetchStyles();
        }
      });
    });

    dom.continueButton.addEventListener("click", () => {
      if (state.selectedGenders.length > 0) {
        require("./uiNavigationModule").showScreen("style-screen");
        styleHandling.fetchStyles();
      }
    });
  } catch (error) {
    console.error("Error in initGenderButtons:", error);
  }
}

function setGenderImages() {
  const allowedGenders = config.allowedGenders || ["man", "woman", "boy", "girl", "group"];
  const arrGenders = flattenGenders(allowedGenders);
  arrGenders.forEach((gender) => {
    const imgElement = document.getElementById(`gender-${gender}`);
    if (imgElement) {
      imgElement.src = `./gender/${gender}.png`;
    }
  });
  const allGenders = ["man", "woman", "boy", "girl", "group"];
  allGenders.forEach((gender) => {
    if (!arrGenders.includes(gender)) {
      const buttonElement = document.querySelector(`.button[data-gender="${gender}"]`);
      if (buttonElement && buttonElement.parentElement) {
        buttonElement.parentElement.style.display = "none";
      }
    }
  });
}

function flattenGenders(allowedGenders) {
  const genders = [];
  const flatten = (item) => {
    if (Array.isArray(item)) {
      item.forEach(flatten);
    } else if (typeof item === "string") {
      item.split(" ").forEach((g) => genders.push(g));
    }
  };
  allowedGenders.forEach(flatten);
  return [...new Set(genders)];
}

module.exports = {
  initGenderButtons,
  setGenderImages
};