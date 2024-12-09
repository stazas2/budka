function createDateFolders() {
   try {
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
     return { inputDir, outputDir };
   } catch (error) {
     console.error("Error in createDateFolders:", error);
     throw error;
   }
 }
 
 function generateFileName() {
   try {
     const date = new Date();
     const timeString = `${date.getHours()}_${date.getMinutes()}_${date.getSeconds()}`;
     const randomString = Math.random().toString(36).substring(2, 6);
     return `${timeString}_${randomString}.jpg`;
   } catch (error) {
     console.error("Error in generateFileName:", error);
     throw error;
   }
 }
 
 function saveImageWithUtils(folderType, base64Image) {
   try {
     const { inputDir, outputDir } = createDateFolders();
     const folderPath = folderType === "input" ? inputDir : outputDir;
     const fileName = generateFileName();
     const filePath = path.join(folderPath, fileName);
     const imageData = base64Image.replace(/^data:image\/\w+;base64,/, "");
     fs.writeFileSync(filePath, imageData, "base64");
     console.log("image saved:", filePath);
   } catch (error) {
     console.error(`Error in saveImage (${folderType}):`, error);
     throw error;
   }
 }
 
 module.exports = { saveImageWithUtils }