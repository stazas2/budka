// canon.js
const { loadConfig } = require("./utils/configLoader")
const fs = require("fs")
const path = require("path")
const sharp = require("sharp")

async function startLiveView() {
  const config = loadConfig()
  await fetch(`${config.localhost}/api/post/evf/start`, { method: "POST" })
}

async function endLiveView() {
  const config = loadConfig()
  await fetch(`${config.localhost}/api/post/evf/end`, { method: "POST" })
}

async function capture() {
  const config = loadConfig()
  const response = await fetch(`${config.localhost}/api/post/capture-image/capture`, { method: "POST" })
  return response.ok
}

async function getUniquePhotoBase64(apiResponse, folderPath, errorImages) {
  const files = await fs.promises.readdir(folderPath)
  const uniqueFiles = files.filter((file) => !errorImages.includes(file))
  if (uniqueFiles.length !== 1) return null
  const filePath = path.join(folderPath, uniqueFiles[0])
  const buffer = await fs.promises.readFile(filePath)
  return buffer.toString("base64")
}

module.exports = { startLiveView, endLiveView, capture, getUniquePhotoBase64 }