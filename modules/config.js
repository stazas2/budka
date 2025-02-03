// modules/config.js
const fs = require("fs");
const path = require("path");
const iconv = require("iconv-lite");

const configPath = path.join(__dirname, "..", "config.json");
let config = {};
if (fs.existsSync(configPath)) {
  const buffer = fs.readFileSync(configPath);
  const configText = iconv.decode(buffer, "windows-1251");
  config = JSON.parse(configText);
}

// Добавляем настройки гендеров если их нет в конфиге
if (!config.genders) {
  console.log("Initializing default genders configuration");
  config.genders = [
    { id: "man", label: "Мужчина", image: "man.png" },
    { id: "woman", label: "Женщина", image: "woman.png" },
    { id: "boy", label: "Мальчик", image: "boy.png" },
    { id: "girl", label: "Девочка", image: "girl.png" }
  ];
}

// Добавляем настройки стилей если их нет в конфиге
if (!config.styles) {
  console.log("Initializing default styles configuration");
  config.styles = [
    { id: "style1", label: "Стиль 1", image: "style1.png" },
    { id: "style2", label: "Стиль 2", image: "style2.png" },
    { id: "style3", label: "Стиль 3", image: "style3.png" }
  ];
}

const translations = require("../translations.json");
const basePath = config.basePath || "./";
const stylesDir = (config.stylesDir || "./styles").replace("{{basePath}}", basePath);
const localhost = "http://localhost:5000"; // адрес сервера (можно вынести в config)
module.exports = { config, translations, basePath, stylesDir, localhost };
