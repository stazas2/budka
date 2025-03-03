const { loadConfig } = require("./configLoader")
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

let config = loadConfig()

// Convert callback-based fs methods to promise-based
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const copyFileAsync = promisify(fs.copyFile);

function createDateFolders() {
  try {
    const dateFolder = path.join(
      baseDir,
      new Date().toISOString().slice(0, 10).replace(/-/g, "_")
    )
    const inputDir = path.join(dateFolder, "input")
    const outputDir = path.join(dateFolder, "output")
    ;[baseDir, dateFolder, inputDir, outputDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    })
    return { inputDir, outputDir }
  } catch (error) {
    console.error("Error in createDateFolders:", error)
    throw error
  }
}

function generateFileName() {
  try {
    const date = new Date()
    const timeString = `${date.getHours()}_${date.getMinutes()}_${date.getSeconds()}`
    const randomString = Math.random().toString(36).substring(2, 6)
    return `${timeString}_${randomString}.jpg`
  } catch (error) {
    console.error("Error in generateFileName:", error)
    throw error
  }
}

/**
 * Saves an image to the specified location
 * @param {string} filename - Filename without extension
 * @param {string} imageData - Base64 encoded image data
 * @returns {Promise<string>} Path to the saved file
 */
async function saveImageWithUtils(filename, imageData) {
  try {
    // Create directory if it doesn't exist
    const saveDir = path.join(__dirname, '..', 'SavedPhotos');
    
    if (!fs.existsSync(saveDir)) {
      await mkdirAsync(saveDir, { recursive: true });
    }
    
    // Handle base64 data
    let buffer;
    if (imageData.startsWith('data:image')) {
      // Remove base64 prefix if present
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      buffer = Buffer.from(imageData, 'base64');
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(saveDir, `${filename}_${timestamp}.jpg`);
    
    await writeFileAsync(filePath, buffer);
    console.log(`Image saved successfully to ${filePath}`);
    
    return filePath;
  } catch (error) {
    console.error('Error saving image:', error);
    throw error
  }
}

/**
 * Copies a photo to a date-organized folder structure
 * @param {string} targetBasePath - Base path for archived photos
 * @param {string} sourcePath - Source file path
 * @returns {Promise<string>} Path to the copied file
 */
async function copyPhotoToDateFolder(targetBasePath, sourcePath) {
  try {
    const date = new Date();
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // Create year/month/day folder structure
    const yearDir = path.join(targetBasePath, year);
    const monthDir = path.join(yearDir, month);
    const dayDir = path.join(monthDir, day);
    
    // Create directories if they don't exist
    if (!fs.existsSync(yearDir)) await mkdirAsync(yearDir, { recursive: true });
    if (!fs.existsSync(monthDir)) await mkdirAsync(monthDir, { recursive: true });
    if (!fs.existsSync(dayDir)) await mkdirAsync(dayDir, { recursive: true });
    
    // Copy file with timestamp
    const filename = path.basename(sourcePath);
    const timestamp = Date.now();
    const destPath = path.join(dayDir, `${timestamp}_${filename}`);
    
    await copyFileAsync(sourcePath, destPath);
    console.log(`Photo archived to ${destPath}`);
    
    return destPath;
  } catch (error) {
    console.error('Error copying photo to date folder:', error);
    throw error;
  }
}

module.exports = { saveImageWithUtils, copyPhotoToDateFolder }
