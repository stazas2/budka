// state.js
const { loadConfig } = require("./utils/configLoader")

let state = {
  selectedStyle: "",
  selectedGenders: [],
  videoStream: null,
  cameraInitialized: false,
  config: loadConfig(),
  currentLanguage: loadConfig().language?.current || "ru",
  inactivityTimer: null // Добавляем таймер в состояние
}

module.exports = {
  getState: () => state,
  setState: (newState) => Object.assign(state, newState)
}