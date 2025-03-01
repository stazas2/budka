const path = require("path")
const fs = require("fs")
const { loadConfig } = require("../utils/configLoader")

const config = loadConfig()
const basePath = config.basePath
const stylesDir = config.stylesDir.replace("{{basePath}}", basePath)

async function getStyles(genders) {
  if (!genders || genders.length === 0) {
    console.warn("Genders not specified. Returning empty style list.")
    return []
  }
  console.log(
    `Loading styles for genders "${(genders || []).join(
      ", "
    )}" from directory: ${stylesDir}`
  )
  try {
    if (!genders || genders.length === 0) {
      console.warn("Genders not specified. Returning empty style list.")
      return []
    }

    const styles = new Set()
    for (const gender of genders) {
      const genderDir = path.join(stylesDir, gender)
      if (!fs.existsSync(genderDir)) {
        console.warn(`Gender directory does not exist: ${genderDir}`)
        continue
      }

      const folders = fs
        .readdirSync(genderDir, { encoding: "utf8" })
        .filter((folder) => {
          const folderPath = path.join(genderDir, folder)
          return fs.statSync(folderPath).isDirectory()
        })

      for (const folder of folders) {
        const folderPath = path.join(genderDir, folder)
        const files = fs.readdirSync(folderPath, { encoding: "utf8" })

        const imageFiles = files.filter(
          (file) =>
            /\.(jpg|jpeg|png)$/i.test(file) && !file.startsWith(`1${folder}`)
        )
        if (imageFiles.length > 0) {
          styles.add({ originalName: folder, displayName: folder })
        }
      }
    }

    if (styles.size === 0) {
      console.warn("No styles found for specified genders")
      return []
    }

    return Array.from(styles)
  } catch (error) {
    console.error("Error reading styles directory:", error)
    return []
  }
}

module.exports = {
  getStyles
}
