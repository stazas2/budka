module.exports.saveImageWithUtils = async function(prefix, imageData) {
    const fs = require("fs");
    const path = require("path");
    const filePath = path.join(__dirname, "..", "SavedImages", `${prefix}_${Date.now()}.jpg`);
    fs.writeFileSync(filePath, imageData.split(",")[1], "base64");
    return filePath;
};