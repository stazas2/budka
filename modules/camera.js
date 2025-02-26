const { config, localhost, imagesFolder } = require('./config')
const fs = require('fs')
const path = require('path')
const imageProcessing = require('./imageProcessing')
const { saveImageWithUtils, copyPhotoToDateFolder } = require('../utils/saveUtils')

// Camera state
let videoStream = null
let cameraInitialized = false
let isLiveViewCanon = false
let liveViewInterval
let lastLiveViewUpdate = null
let isFetchingLiveView = false

// DOM elements
const video = document.getElementById("video")
const canvas = document.getElementById("canvas")
const liveViewImage = document.getElementById("liveViewImage")
const liveViewContainer = document.getElementById("liveViewContainer")
const noResponseWarning = document.createElement("p")

// Camera configuration
let cameraMode = config.cameraMode || "pc"

// Export cameraMode for other modules
exports.cameraMode = cameraMode;

// Resolutions to try
const resolutions = [
  { width: 1920, height: 1280 },
  { width: 1080, height: 720 },
  { width: 640, height: 480 },
]

// Listen for take-picture event
document.addEventListener('take-picture', async () => {
  await takePicture();
});

/**
 * Apply rotation styles to camera feed
 */
function applyRotationStyles() {
  try {
    const videoElement = document.getElementById("video")
    if (videoElement) {
      videoElement.style.transform = `rotate(${config.camera_rotation}deg)`
      console.log(
        `▶️ Camera rotation set to ${config.camera_rotation} degrees`
      )
    }
  } catch (error) {
    console.error("Error in applyRotationStyles:", error)
  }
}

/**
 * Initialize the appropriate camera based on config
 */
async function initCamera() {
  if (cameraMode === "canon") {
    video.style.display = "none"
    // Start the countdown which will eventually call takePicture
    document.dispatchEvent(new CustomEvent('start-countdown'))
  } else {
    try {
      await startCamera()
      // Start the countdown which will eventually call takePicture
      document.dispatchEvent(new CustomEvent('start-countdown'))
    } catch (err) {
      alert("Unable to access the webcam.")
      console.log("Error: " + err)
      document.dispatchEvent(new CustomEvent('show-screen', { 
        detail: window.amountOfStyles === 1 ? "gender-screen" : "style-screen" 
      }))
    }
  }
}

/**
 * Start webcam and find best resolution
 */
async function startCamera() {
  try {
    liveViewContainer.style.display = "none"
    const videoContainer = document.querySelector(".video-container")
    const cameraBackButton = document.querySelector(
      "#camera-screen .back-button"
    )
    cameraBackButton.disabled = true
    
    videoContainer.classList.add("loading")
    const bestResolution = await findBestResolution()
    console.log(
      `Using resolution: ${bestResolution.width}x${bestResolution.height}`
    )

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: bestResolution.width,
        height: bestResolution.height,
      },
    })
    videoStream = stream
    video.srcObject = stream

    await Promise.race([
      new Promise((resolve) => {
        video.onloadedmetadata = () => {
          cameraInitialized = true
          console.log("Camera metadata successfully loaded")
          resolve()
        }
      }),
      new Promise(
        (_, reject) =>
          setTimeout(() => {
            reject(new Error("Camera initialization timed out"))
          }, 3000)
      ),
    ])

    videoContainer.classList.remove("loading")
    console.log("▶️ Camera started successfully")
    cameraBackButton.disabled = false
    return true
  } catch (error) {
    console.error("Error starting camera:", error)
    throw error
  }
}

/**
 * Stop the camera
 */
function stopCamera() {
  try {
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop())
      video.srcObject = null
      videoStream = null
      cameraInitialized = false
      console.log("Camera stopped")
    }
    
    if (isLiveViewCanon) {
      endLiveView()
    }
  } catch (error) {
    console.error("Error in stopCamera:", error)
  }
}

/**
 * Take a picture using the current camera
 */
async function takePicture() {
  let imageData = null

  try {
    if (cameraMode === "canon") {
      try {
        let errorImages = []
        try {
          fs.readdir(imagesFolder, (err, files) => {
            if (err) {
              console.error(err)
              return
            }
            errorImages = [...files]
          })

          const apiResponse = await capture()
          imageData = await getUniquePhotoBase64(
            apiResponse,
            imagesFolder,
            errorImages
          )
          if (!imageData) {
            console.error("Photo is in incorrect format or doesn't exist.")
          } else
            console.log(
              "▶️ First 20 bytes of image: \n" + imageData.slice(0, 20)
            )
        } catch (error) {
          console.error("Error in takePicture:", error)
          alert("Failed to take a photo.")
        }

        if (imageData) {
          await imageProcessing.sendDataToServer(imageData)
          console.log("▶️ Canon photo taken and sent.")
        } else document.dispatchEvent(new CustomEvent('show-screen', { detail: "style-screen" }))
      } catch (error) {
        console.error("Error in takePicture:", error)
        alert("Failed to take a photo.")
        document.dispatchEvent(new CustomEvent('show-screen', { detail: "style-screen" }))
      }
    } else {
      // PC camera mode
      const context = canvas.getContext("2d")
      const rotationAngle = config.send_image_rotation || 0
      if (rotationAngle === 90 || rotationAngle === 270) {
        canvas.width = video.videoHeight
        canvas.height = video.videoWidth
      } else {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }

      context.clearRect(0, 0, canvas.width, canvas.height)
      context.save()
      context.translate(canvas.width / 2, canvas.height / 2)
      context.rotate((rotationAngle * Math.PI) / 180)
      if (rotationAngle === 90 || rotationAngle === 270) {
        context.drawImage(
          video,
          -video.videoWidth / 2,
          -video.videoHeight / 2,
          video.videoWidth,
          video.videoHeight
        )
      } else {
        context.drawImage(
          video,
          -canvas.width / 2,
          -canvas.height / 2,
          canvas.width,
          canvas.height
        )
      }

      context.restore()
      stopCamera()

      imageData = canvas.toDataURL("image/png")
      console.log("Photo taken successfully.")

      try {
        await saveImageWithUtils("input", imageData)
        console.log("Input photo saved successfully.")
      } catch (error) {
        console.error("Error saving input photo:", error)
      }

      await imageProcessing.sendDataToServer(imageData)
    }
  } catch (error) {
    console.error("Error in takePicture:", error)
    alert("Failed to take a photo.")
    document.dispatchEvent(new CustomEvent('show-screen', { detail: "style-screen" }))
  }
}

/**
 * Find the best supported camera resolution
 */
async function findBestResolution() {
  try {
    for (let resolution of resolutions) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { exact: resolution.width },
            height: { exact: resolution.height },
          },
        })
        stream.getTracks().forEach((track) => track.stop())
        return resolution
      } catch {}
    }
    throw new Error("No supported resolutions found.")
  } catch (error) {
    console.error("Error in findBestResolution:", error)
    throw error
  }
}

// Canon specific functions
async function startLiveView() {
  isLiveViewCanon = true
  try {
    await fetch(`${localhost}/api/post/evf/start`, { method: "POST" })
    liveViewInterval = setInterval(updateLiveView, 100)
    lastLiveViewUpdate = Date.now()
    noResponseWarning.style.display = "none"
    liveViewImage.style.display = "block"
  } catch (error) {
    console.error("Error starting Live View:", error)
  }
}

async function endLiveView() {
  isLiveViewCanon = false
  try {
    await fetch(`${localhost}/api/post/evf/end`, { method: "POST" })
    clearInterval(liveViewInterval)
    liveViewImage.style.display = "none"
    noResponseWarning.style.display = "none"
  } catch (error) {
    console.error("Error ending Live View:", error)
  }
}

async function updateLiveView() {
  if (isFetchingLiveView) {
    return
  }

  isFetchingLiveView = true

  try {
    const response = await fetch(`${localhost}/api/get/live-view`)
    if (response.ok) {
      const blob = await response.blob()
      liveViewImage.src = URL.createObjectURL(blob)
      liveViewImage.style.display = "block"
      liveViewImage.onload = () => URL.revokeObjectURL(liveViewImage.src)
      lastLiveViewUpdate = Date.now()
      noResponseWarning.style.display = "none"
    }
  } catch (error) {
    console.error("Live view error:", error)
  } finally {
    isFetchingLiveView = false
  }
}

async function reconnect() {
  showBlockingOverlay()

  if (document.getElementById("camera-screen").classList.contains("active")) {
    if (window.amountOfStyles > 1) {
      document.dispatchEvent(new CustomEvent('show-screen', { detail: "style-screen" }))
    } else {
      document.dispatchEvent(new CustomEvent('show-screen', { detail: "gender-screen" }))
    }
  }

  const wasEvfActive = isLiveViewCanon
  try {
    await new Promise((resolve) => setTimeout(resolve, 5000))
    if (wasEvfActive) {
      console.log("Turning off EVF before reconnect...")
      await endLiveView()
      console.log("EVF turned off.")
    }

    console.log("Reconnecting...")
    await fetch(`${localhost}/api/post/reconnect`, { method: "POST" })
    console.log("Reconnect successful.")

    if (wasEvfActive) {
      console.log("Waiting a few seconds before turning on EVF...")
      await new Promise((resolve) => setTimeout(resolve, 5000))
      console.log("Turning on EVF after reconnect...")
      await startLiveView()
      console.log("EVF turned on.")
    }

    // Check live view before hiding overlay
    const liveResponse = await fetch(`${localhost}/api/get/live-view`)
    if (liveResponse.ok) {
      console.log("Live view active, hiding overlay.")
      hideBlockingOverlay()
    } else {
      throw new Error("Live view not responding after reconnect.")
    }
  } catch (error) {
    console.error("Reconnect error:", error)
  }
}

function showBlockingOverlay() {
  let overlay = document.getElementById("blocking-overlay")
  if (!overlay) {
    overlay = document.createElement("div")
    overlay.id = "blocking-overlay"
    overlay.style.position = "fixed"
    overlay.style.top = "0"
    overlay.style.left = "0"
    overlay.style.width = "100%"
    overlay.style.height = "100%"
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)"
    overlay.style.color = "white"
    overlay.style.display = "flex"
    overlay.style.alignItems = "center"
    overlay.style.justifyContent = "center"
    overlay.style.zIndex = "9999"
    overlay.style.fontSize = "24px"
    overlay.innerHTML = "Connecting camera, please wait..."
    document.body.appendChild(overlay)
  }
}

function hideBlockingOverlay() {
  const overlay = document.getElementById("blocking-overlay")
  if (overlay) {
    overlay.remove()
  }
}

async function capture() {
  try {
    const response = await fetch(
      `${localhost}/api/post/capture-image/capture`,
      { method: "POST" }
    )

    if (response.ok) {
      console.log("Photo taken.")
      return response.ok
    } else {
      console.error("Error taking photo.")
    }
  } catch (error) {
    console.error("Error:", error)
  }
}

async function getUniquePhotoBase64(apiResponse, folderPath, error_images) {
  try {
    if (!apiResponse) {
      throw new Error("API response not received.")
    }

    // Get list of files in folder
    let photos = []
    try {
      photos = await fs.promises.readdir(folderPath)
    } catch (err) {
      console.error("Error reading folder:", err)
      throw err
    }

    console.log("📸 Found files:", photos)

    if (error_images.length > 0) {
      console.log("🚫 Excluded files (errors):", error_images)
    }

    // Keep only files that are not in error_images
    const uniqueFiles = photos.filter((file) => !error_images.includes(file))

    if (uniqueFiles.length !== 1) {
      console.error(
        "⚠ Error: not exactly one unique photo found!",
        uniqueFiles
      )
      throw new Error("Exactly one unique file not found")
    }

    // Form full path to file
    const uniqueFilePath = path.join(folderPath, uniqueFiles[0])
    console.log(`📂 File found: ${uniqueFiles[0]}`)

    // Wait until file is fully written
    await waitForFileReady(uniqueFilePath)
    const base64Image = await getBase64Image(uniqueFilePath)

    // Remove image from uniqueFilePath
    if (base64Image) {
      try {
        await fs.promises.unlink(uniqueFilePath)
        console.log(`File deleted successfully.`)
      } catch (err) {
        console.error(`❌ Error deleting file ${uniqueFilePath}:`, err)
      }
    }

    // Convert to base64
    return base64Image
  } catch (error) {
    console.error("❌ Error in getUniquePhotoBase64:", error)
    return null
  }
}

async function waitForFileReady(filePath) {
  let attempts = 0
  while (attempts < 5) {
    try {
      // Check if file exists
      await fs.promises.access(filePath)

      // Check file size
      const stats = await fs.promises.stat(filePath)
      if (stats.size > 0) {
        console.log(`✅ File of size ${stats.size} bytes found.`)

        // Try to open file for reading (guarantee it's fully written)
        try {
          await fs.promises.readFile(filePath)
          console.log(`File available for reading.`)
          return
        } catch (readError) {
          console.log(
            `⚠ File ${filePath} not ready for reading yet, trying again...`
          )
        }
      }
    } catch (err) {
      console.error(`⚠ Error checking file ${filePath}:`, err)
    }

    console.log("⏳ File not ready yet, waiting 500ms...")
    await new Promise((resolve) => setTimeout(resolve, 500))
    attempts++
  }
  throw new Error(`❌ File ${filePath} not ready after 5 attempts`)
}

async function getBase64Image(filePath) {
  let attempts = 0
  const { canonPhotosPath } = require('./config')
  
  while (attempts < 5) {
    try {
      // Ensure file is ready for reading
      await waitForFileReady(filePath)

      // Read file as Buffer
      const inputBuffer = await fs.promises.readFile(filePath)

      // Compress, rotate and convert to base64
      const sharp = require('sharp')
      const data = await sharp(inputBuffer)
        .rotate(config.camera_rotation)
        .resize({ width: 1280, height: 720, fit: "inside" })
        .toFormat("jpeg", { quality: 80 })
        .toBuffer()

      await copyPhotoToDateFolder(canonPhotosPath, filePath)

      return data.toString("base64")
    } catch (err) {
      console.warn(`❌ Compression error (attempt ${attempts + 1}):`, err)

      if (err.message.includes("Premature end of input file")) {
        console.log(
          "⏳ File still not fully written. Waiting 500ms and trying again..."
        )
        await new Promise((resolve) => setTimeout(resolve, 500))
        attempts++
      } else {
        return null // If error is not related to the file, abort
      }
    }
  }

  console.error(`❌ Failed to process file ${filePath} after 5 attempts.`)
  return null
}

// Monitor live view state
function monitorLiveView() {
  setInterval(() => {
    if (
      isLiveViewCanon &&
      lastLiveViewUpdate &&
      Date.now() - lastLiveViewUpdate > 3000
    ) {
      console.warn(
        "LiveView not responding for more than 3 seconds. Attempting to reconnect..."
      )
      reconnect()
    }
  }, 3000)
}

module.exports = {
  applyRotationStyles,
  initCamera,
  startCamera,
  stopCamera,
  takePicture,
  startLiveView,
  endLiveView,
  reconnect,
  monitorLiveView,
  cameraMode,
}
