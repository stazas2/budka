const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function saveImage(folderType, urlImage) {
  try {
    const config = {}; // TODO: fetch config via ConfigurationService or pass as argument
    const baseDir = process.env.PHOTO_DIR || "C:\\temp\\photos";

    const dateFolder = path.join(
      baseDir,
      new Date().toISOString().slice(0, 10).replace(/-/g, "_")
    );
    const inputDir = path.join(dateFolder, "input");
    const outputDir = path.join(dateFolder, "output");

    [baseDir, dateFolder, inputDir, outputDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    const folderPath = folderType === "input" ? inputDir : outputDir;

    const date = new Date();
    const timeString = `${date.getHours()}_${date.getMinutes()}_${date.getSeconds()}`;
    const randomString = Math.random().toString(36).substring(2, 6);
    const fileName = `${timeString}_${randomString}.jpg`;
    const filePath = path.join(folderPath, fileName);

    let fileBuffer;

    if (folderType === "input" || !/^https?:\/\//.test(urlImage)) {
      const imageData = urlImage.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(imageData, "base64");

      fileBuffer = await sharp(buffer)
        .resize({ width: 1280, height: 720, fit: "inside" })
        .toFormat("jpeg", { quality: 80 })
        .toBuffer();
    } else {
      const response = await fetch(urlImage);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    }

    if (folderType === "copyDirectory") {
      let hotPath = "C:\\DNP\\Hot Folder\\Prints\\4x6";
      if (config?.hotFolder && typeof config.hotFolder === 'object') {
        hotPath = config.hotFolder.path || hotPath;
      }
      if (!fs.existsSync(hotPath)) {
        fs.mkdirSync(hotPath, { recursive: true });
      }
      const hotFilePath = path.join(hotPath, fileName);
      fs.writeFileSync(hotFilePath, fileBuffer);
      console.log("▶️ Image copied to hot folder:", hotFilePath);
    } else {
      fs.writeFileSync(filePath, fileBuffer);
      console.log(`▶️ Image saved (${folderType}):`, filePath);
    }

    return { success: true, fileName };
  } catch (error) {
    console.error("Error in saveImage:", error);
    return { success: false, error: error.message };
  }
}

module.exports = { saveImage };