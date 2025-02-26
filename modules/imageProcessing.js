const fs = require('fs')
const path = require('path')
const { 
  config, basePath, basePathName, stylesDir, 
  printLogo, logo_scale, logo_pos_x, logo_pos_y 
} = require('./config')
const QRCode = require('qrcode')
const { saveImageWithUtils } = require('../utils/saveUtils')

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
      if (imageData) {
        urlImage = imageData
      } else {
        console.error("Image not found!")
        urlImage = null
      }
    } else urlImage = imageData.split(",")[1]

    const fonImage = getRandomImageFromStyleFolder(nameDisplay, selectedGenders)
    const base64FonImage = fonImage ? fonImage.split(",")[1] : urlImage

    // Logo in base64 format
    const logoData = fs.readFileSync(printLogo, { encoding: "base64" })
    const logo_base64 = `data:image/png;base64,${logoData}`.split(",")[1]

    const genders = selectedGenders.join(", ")

    const data = {
      mode: `${config?.mode}` || "Avatar",
      style: selectedStyle,
      return_s3_link: true,
      event: basePathName,
      logo_base64,
      logo_pos_x,
      logo_pos_y,
      logo_scale,
      params: {
        Sex: genders,
        Face: urlImage,
        Fon: base64FonImage,
      },
    }

    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${config?.authToken}`,
      "Content-Type": "application/json",
    }

    const fetchOptions = {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data),
    }

    const logFilePath = path.join(basePath, "request_log.txt")
    fs.writeFileSync(
      logFilePath,
      `Headers: ${JSON.stringify(headers, null, 2)}\nData: ${JSON.stringify(
        data,
        null,
        2
      )}`,
      "utf-8"
    )
    console.log("Request log saved at:", logFilePath)

    progressBar.style.display = "block"
    progressBarFill.style.width = "100%"
    progressPercentage.style.display = "none"

    fetch("http://90.156.158.209/api/handler/", fetchOptions)
      .then((response) => {
        console.log("▶️ HTTP response status:", response.status)
        if (response.status === 403) {
          throw new Error("403 Forbidden: server denied access")
        }
        if (!response.ok) {
          throw new Error("Network error: " + response.status)
        }
        return response.json()
      })
      .then((responseData) => {
        console.log("Data received from server:", responseData)
        handleServerResponse(responseData)
      })
      .catch((error) => {
        if (error.message.includes("403")) {
          console.error("Error:", error.message)
          alert("Error 403: access denied")
          document.dispatchEvent(new CustomEvent('show-screen', { detail: "style-screen" }))
          return // Don't use backup server for 403
        }
        fetch("http://85.95.186.114/api/handler/", fetchOptions)
          .then((response) => {
            console.log("HTTP response status:", response.status)
            if (!response.ok) {
              throw new Error("Network error: " + response.status)
            }
            return response.json()
          })
          .then((responseData) => {
            handleServerResponse(responseData)
          })
          .catch((error) => {
            console.error(
              "Error sending data to backup server:",
              error
            )
            alert("Error sending image to server.")
            document.dispatchEvent(new CustomEvent('show-screen', { detail: "style-screen" }))
          })
      })
  } catch (error) {
    console.error("Error in sendDataToServer:", error)
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
