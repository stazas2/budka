const { exec, execSync } = require('child_process');
const path = require('path');
const { app } = require('electron');
const IpcChannels = require('../../shared/constants/IpcChannels');

class CanonCameraService {
    constructor() {
        this.isRunning = false;
        this.checkInterval = null;
    }

    start() {
        if (this.isRunning) return;

        const canonAppDir = path.resolve(app.getAppPath(), '..', 'canon');
        
        try {
            if (!fs.existsSync(path.join(canonAppDir, 'start.bat'))) {
                throw new Error(`start.bat not found in ${canonAppDir}`);
            }

            exec("start.bat", { cwd: canonAppDir }, (error, stdout, stderr) => {
                if (error) throw error;
                
                this.isRunning = true;
                this.startMonitoring();
            });
        } catch (error) {
            console.error("[CanonService] Error starting camera:", error);
            throw error;
        }
    }

    stop() {
        if (!this.isRunning) return;
        
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        try {
            execSync("taskkill /IM Api.exe /F");
            execSync("taskkill /IM CameraControl.exe /F"); 
            execSync("taskkill /IM CameraControllerClient.exe /F");
            this.isRunning = false;
        } catch (error) {
            console.error("[CanonService] Error stopping camera:", error);
            throw error;
        }
    }

    startMonitoring() {
        if (this.checkInterval) return;

        this.checkInterval = setInterval(() => {
            exec('tasklist /FI "IMAGENAME eq CameraControl.exe"', (error, stdout) => {
                const wasRunning = this.isRunning;
                this.isRunning = stdout.toLowerCase().includes("cameracontrol.exe");
                
                if (wasRunning && !this.isRunning) {
                    console.log("[CanonService] CameraControl.exe stopped");
                    clearInterval(this.checkInterval);
                    this.checkInterval = null;
                }
            });
        }, 5000);
    }
}

module.exports = new CanonCameraService();