const fs = require('fs')
const path = require('path')
const { 
  config, basePath, basePathName, stylesDir, 
  printLogo, logo_scale, logo_pos_x, logo_pos_y 
} = require('./config')
const QRCode = require('qrcode')
const { saveImageWithUtils } = require('../utils/saveUtils')
const sharp = require('sharp')

// Object to store indices for each style
const styleImageIndices = {}

// DOM elements
const resultImage = document.getElementById("result-image")
const qrCodeImage = document.getElementById("qr-code-img")
const progressBar = document.getElementById("progress-bar")
const progressBarFill = document.getElementById("progress-bar-fill")
const progressPercentage = document.getElementById("progress-percentage")
const processingScreen = document.getElementById("processing-screen")

/**
 * Sends photo to server for processing
 * @param {string} imageData - Base64 or raw image data
 */
async function sendDataToServer(imageData) {
  try {
    console.log("Sending image to server")
    // Use document.dispatchEvent instead of direct module call to avoid circular dependency
    document.dispatchEvent(new CustomEvent('show-screen', { detail: "processing-screen" }))

    let urlImage = null
    const selectedStyle = window.selectedStyle || ""
    const nameDisplay = window.nameDisplay || ""
    const selectedGenders = window.selectedGenders || []

    if (require('./camera').cameraMode === "canon") {
      // For Canon camera, handle the Buffer or base64 data properly
      console.log("Processing Canon camera image");
      
      // Convert base64 string to buffer if needed
      let imageBuffer;
      if (typeof imageData === 'string') {
        imageBuffer = Buffer.from(imageData, 'base64');
      } else {
        imageBuffer = imageData; // Already a buffer
      }
      
      // Process the image using local libraries
      await processCanonImage(imageBuffer);
    } else {
      // Non-Canon camera processing logic
      console.log("Processing webcam image");
      
      // Send the image data to server
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData,
          userId: config.userId || 'anonymous',
          styleId: window.selectedStyle || 'default'
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log("Image processing successful");
      
      // Display the processed image
      document.dispatchEvent(new CustomEvent('show-processed-image', { 
        detail: { imageUrl: result.processedImageUrl }
      }));
    }
    
    // Move to the result screen
    document.dispatchEvent(new CustomEvent('show-screen', { detail: "result-screen" }));
  } catch (error) {
    console.error("Error in sendDataToServer:", error);
    alert("Image processing failed. Please try again.");
    document.dispatchEvent(new CustomEvent('show-screen', { detail: "style-screen" }));
  }
}

/**
 * Process Canon image locally
 * @param {Buffer} imageBuffer - Image data as buffer
 */
async function processCanonImage(imageBuffer) {
  try {
    // Create necessary directories
    const outputDir = path.join(__dirname, '..', 'processed');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(outputDir, `processed_${timestamp}.jpg`);
    
    // Process image with Sharp
    await sharp(imageBuffer)
      .resize({ width: 1200, height: 800, fit: 'inside' })
      .jpeg({ quality: 90 })
      .toFile(outputPath);
    
    console.log(`Canon image processed and saved to ${outputPath}`);
    
    // Display the processed image
    const imageUrl = `file://${outputPath.replace(/\\/g, '/')}`;
    document.dispatchEvent(new CustomEvent('show-processed-image', { 
      detail: { imageUrl }
    }));
    
    return outputPath;
  } catch (error) {
    console.error("Error processing Canon image:", error);
    throw error;
  }
}

/**
 * Generates QR code for photo link
 * @param {string} url - The URL for the QR code
 * @returns {Promise<string>} Base64 encoded QR code image
 */
async function generateQrCodeFromURL(url) {
  try {
    const qrCodeData = await QRCode.toDataURL(url)
    return qrCodeData
  } catch (err) {
    console.error("Error in generateQrCodeFromURL:", err)
    throw err
  }
}

/**
 * Handles server response with processed image
 * @param {Object} responseData - Response from the image processing server
 */
async function handleServerResponse(responseData) {
  try {
    const imagesArray = Object.values(responseData)[0]
    if (imagesArray && imagesArray.length > 0) {
      const cleanedURL = imagesArray[0].replace("?image_url=", "").trim()

      resultImage.src = cleanedURL
      await saveImageWithUtils("output", resultImage.src)

      resultImage.onload = () => {
        console.log("▶️ Photo loaded successfully.")
        console.log(
          "Image resolution: ",
          resultImage.width,
          "x",
          resultImage.height
        )
        document.dispatchEvent(new CustomEvent('show-screen', { detail: "result-screen" }))
        updatePrintButtonVisibility()
      }

      try {
        const qrCodeData = await generateQrCodeFromURL(imagesArray[0])
        qrCodeImage.src = qrCodeData
      } catch (error) {
        console.error("Error generating QR code:", error)
      }
    } else {
      alert("Failed to get processed image.")
      document.dispatchEvent(new CustomEvent('show-screen', { detail: "style-screen" }))
    }
  } catch (error) {
    console.error("Error in handleServerResponse:", error)
  }
}

/**
 * Updates print button visibility based on configuration
 */
function updatePrintButtonVisibility() {
  const printPhotoButton = document.getElementById("print-photo")
  if (config.printButtonVisible) {
    printPhotoButton.style.display = "block"
  } else {
    printPhotoButton.style.display = "none"
  }
}

/**
 * Picks a random background from style folder
 * @param {string} style - The style name to get background from
 * @param {Array} selectedGenders - List of selected genders
 * @returns {string|null} Base64 encoded image or null if not found
 */
function getRandomImageFromStyleFolder(style, selectedGenders) {
  try {
    if (!selectedGenders || !selectedGenders.length || !style) {
      console.error("Missing required parameters for getRandomImageFromStyleFolder")
      return null
    }
    
    const styleFolderPath = path.join(stylesDir, selectedGenders[0], style)

    if (!fs.existsSync(styleFolderPath)) {
      console.warn(
        `\x1b[41m[Warning]\x1b[0m Folder for Style "${style}" and Gender "${selectedGenders[0]}" doesn't exist.`
      )
      return null
    }

    console.log(`Reading folder: ${styleFolderPath}`)

    // Clean style (remove brackets content)
    const cleanedStyle = style.replace(/\s*\(.*?\)/g, "")
    const excludeList = [
      `1${cleanedStyle}.jpg`,
      `1${cleanedStyle}.jpeg`,
      `1${cleanedStyle}.png`,
    ]

    const files = fs
      .readdirSync(styleFolderPath)
      .filter((file) => /\.(jpg|jpeg|png)$/i.test(file))
      .filter((file) => {
        const isExcluded = excludeList.includes(file)
        return !isExcluded
      })

    if (files.length === 0) {
      console.warn(
        `\x1b[41m[Warning]\x1b[0m No images found for style "${style}"`
      )
      return null
    }

    // Initialize index for style if it doesn't exist yet
    if (!styleImageIndices[style]) {
      styleImageIndices[style] = 0
    }

    // Use current index to select file
    const currentIndex = styleImageIndices[style]
    const fileName = files[currentIndex]

    // Update index for next call
    styleImageIndices[style] = (currentIndex + 1) % files.length

    console.log(`▶️ Selected background: ${fileName}`)
    const filePath = path.join(styleFolderPath, fileName)

    const imageData = fs.readFileSync(filePath, { encoding: "base64" })
    const mimeType = fileName.endsWith(".png") ? "image/png" : "image/jpeg"

    return `data:${mimeType};base64,${imageData}`
  } catch (error) {
    console.error(
      `Error in getRandomImageFromStyleFolder for style "${style}":`,
      error
    )
    return null
  }
}

module.exports = {
  sendDataToServer,
  generateQrCodeFromURL,
  handleServerResponse,
  updatePrintButtonVisibility,
  getRandomImageFromStyleFolder
}
