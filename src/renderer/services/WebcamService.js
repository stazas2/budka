class WebcamService {
    constructor() {
        this.stream = null;
    }

    async startVideo(videoElement) {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoElement.srcObject = this.stream;
            await videoElement.play();
        } catch (error) {
            console.error("[WebcamService] Error starting webcam:", error);
            throw error;
        }
    }

    stopVideo() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }
}

module.exports = new WebcamService();