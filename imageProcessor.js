// imageProcessor.js
const { loadConfig } = require("./utils/configLoader")
const { getState } = require("./state")
const fs = require("fs")
const path = require("path")

async function sendDateToServer(imageData, onProcessing, onResult, resultImage) {
  const config = loadConfig()
  const { selectedStyle, selectedGenders } = getState()

  // Вызываем коллбэк для показа экрана обработки
  onProcessing()

  const logoData = fs.readFileSync(config.logoPath, { encoding: "base64" })
  const data = {
    mode: config?.mode || "Avatar",
    style: selectedStyle,
    return_s3_link: true,
    event: path.basename(config.basePath),
    logo_base64: logoData,
    logo_pos_x: config.logo_pos_x,
    logo_pos_y: config.logo_pos_y,
    logo_scale: config.logo_scale,
    params: {
      Sex: selectedGenders.join(", "),
      Face: imageData.split(",")[1]
    }
  }

  const response = await fetch("http://90.156.158.209/api/handler/", {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${config?.authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) throw new Error("Network error")
  const responseData = await response.json()
  const imageUrl = Object.values(responseData)[0][0].replace("?image_url=", "").trim()
  resultImage.src = imageUrl

  // Вызываем коллбэк для показа экрана результата
  onResult()
}

module.exports = { sendDateToServer }