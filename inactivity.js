// inactivity.js
const { loadConfig } = require("./utils/configLoader");
const { getState, setState } = require("./state");

function resetInactivityTimer(showScreen, stopCamera) {
  const { inactivityTimer, config } = getState();
  console.log("Сброс таймера бездействия...");
  if (inactivityTimer) {
    console.log("Очистка существующего таймера бездействия");
    clearTimeout(inactivityTimer);
  }

  const timeoutDuration = config.inactivityTimeout || 60000;
  console.log(`Установка таймера на ${timeoutDuration / 1000} секунд`);
  const newTimer = setTimeout(() => {
    console.log("Таймер бездействия сработал, возврат на начальный экран");
    showScreen("splash-screen");
    stopCamera();
    console.log("Экран splash-screen отображён, камера остановлена");
  }, timeoutDuration);
  setState({ inactivityTimer: newTimer });
  console.log("Таймер бездействия установлен");
}

module.exports = { resetInactivityTimer };