// camera.js
const { loadConfig } = require("./utils/configLoader")
const { sendDateToServer } = require("./imageProcessor")
const { capture, getUniquePhotoBase64 } = require("./canon")
const { getState, setState } = require("./state")

async function startCamera() {
  const { video } = require("./scripts")
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 1920, height: 1280 }
  })
  setState({ videoStream: stream, cameraInitialized: true })
  video.srcObject = stream
}

function stopCamera() {
  const { videoStream } = getState()
  if (videoStream) {
    videoStream.getTracks().forEach((track) => track.stop())
    setState({ videoStream: null, cameraInitialized: false })
  }
}

async function takePicture(onProcessing, onResult, resultImage) {
  const { config, canvas, video } = require("./scripts")
  const state = getState()

  if (config.cameraMode === "canon") {
    const apiResponse = await capture()
    const imageData = await getUniquePhotoBase64(apiResponse, config.imagesFolder || './canon/SavedPhotos/', [])
    if (imageData) {
      await sendDateToServer(imageData, onProcessing, onResult, resultImage)
    }
  } else {
    const context = canvas.getContext("2d")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = canvas.toDataURL("image/png")
    stopCamera()
    await sendDateToServer(imageData, onProcessing, onResult, resultImage)
  }
}

module.exports = { startCamera, stopCamera, takePicture }