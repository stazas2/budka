const dom = require("./domElements");

async function initCamera() {
    console.log("Starting camera initialization");
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 1280, height: 720 } 
        });
        
        console.log("Camera stream obtained");
        if (dom.video) {
            dom.video.srcObject = stream;
            console.log("Video element source set");
            
            // Скрыть лоадер после успешной инициализации
            const loader = document.getElementById("camera-loader");
            if (loader) {
                loader.style.display = "none";
            }
            
            // Показать видео
            dom.video.style.display = "block";
        } else {
            console.error("Video element not found");
        }
    } catch (error) {
        console.error("Error initializing camera:", error);
    }
}

function stopCamera() {
    console.log("Stopping camera");
    if (dom.video && dom.video.srcObject) {
        const tracks = dom.video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        dom.video.srcObject = null;
    }
}

// Только захват фото, без обработки
function takePhoto() {
    console.log("Taking photo");
    if (dom.video && dom.canvas) {
        const context = dom.canvas.getContext('2d');
        context.drawImage(dom.video, 0, 0, dom.canvas.width, dom.canvas.height);
        stopCamera();
        return dom.canvas.toDataURL('image/jpeg');
    }
    return null;
}

module.exports = { initCamera, stopCamera, takePhoto };
