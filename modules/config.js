// -*- coding: utf-8 -*-
// Декодируем config.json, сохранённый в кодировке Windows-1251
const fs = require("fs");
const path = require("path");
const iconv = require("iconv-lite");

const configPath = path.join(__dirname, "..", "config.json");
let config = {};
if (fs.existsSync(configPath)) {
  const buffer = fs.readFileSync(configPath);
  // Ð”ÐµÐºÐ¾Ð´Ð¸Ñ€ÑƒÐµÐ¼ config.json, ÑÑ‡Ð¸Ñ‚Ð°Ð½Ð½Ñ‹Ð¹ Ð² ÐºÐ¾Ð´Ð¸Ñ€Ð¾Ð²ÐºÐµ Windows-1251
  const configText = iconv.decode(buffer, "windows-1251");
  config = JSON.parse(configText);
}

const translations = require("../translations.json");

const basePath = config.basePath;
const basePathName = path.basename(basePath);
const baseDir = require("path").join(basePath, "SavedPhotos");
const stylesDir = config.stylesDir.replace("{{basePath}}", basePath);
const localhost = "http://localhost:5000";
const printLogo = config?.logoPath;

module.exports = {
  config,
  translations,
  basePath,
  basePathName,
  baseDir,
  stylesDir,
  localhost,
  printLogo
};