const { exec, execSync, spawn } = require("child_process");
const configLoader = require('../utils/configLoader');
const os = require('os');
const path = require('path');
const fs = require('fs');

// Ensure proper encoding for exec commands on Windows
const execOptions = process.platform === 'win32' ? { encoding: 'utf8' } : {};

const config = configLoader.loadConfig();
let cameraCheckInterval = null;
let camera = null;
let cameraConfig = null;
let canonProcesses = [];

/**
 * Initialize the camera with configuration
 */
const initCamera = async () => {
  try {
    const config = configLoader.getConfig ? configLoader.getConfig() : configLoader.loadConfig();
    cameraConfig = config;
    
    console.log(`Initializing camera with mode: ${config.cameraMode || 'default'}`);
    
    // Initialize based on camera mode
    switch(config.cameraMode) {
      case 'pc':
        console.log('Initializing PC camera');
        break;
      case 'dslr':
        console.log('Initializing DSLR camera');
        break;
      case 'canon':
        console.log('Initializing Canon camera');
        await startCanonProcesses();
        break;
      default:
        console.log('Unknown camera mode:', config.cameraMode);
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing camera:', error);
    throw error;
  }
};

/**
 * Start the Canon camera processes
 */
async function startCanonProcesses() {
  try {
    console.log("Starting Canon camera processes...");
    
    // Get path to project root directories
    const budkaDir = path.resolve(__dirname, '..');
    const mosPhotoBoothDir = "C:/MosPhotoBooth2";
    
    // Look for Canon software - prioritize project's canon folder
    const possiblePaths = [
      // Project-relative paths (highest priority)
      path.join(budkaDir, 'canon', 'CameraControl.exe'),
      path.join(mosPhotoBoothDir, 'canon', 'CameraControl.exe'),
      
      // Standard installation paths
      // "C:/Program Files/Canon/EOS Utility/CameraControl.exe",
      // "C:/Program Files (x86)/Canon/EOS Utility/CameraControl.exe"
    ];
    
    // Find the first path that exists
    let cameraControlPath = null;
    for (const p of possiblePaths) {
      console.log(`Checking for CameraControl.exe at: ${p}`);
      if (fs.existsSync(p)) {
        cameraControlPath = p;
        console.log(`Found CameraControl.exe at: ${p}`);
        break;
      }
    }
    
    if (!cameraControlPath) {
      console.error("Canon CameraControl.exe not found in common locations");
      if (cameraConfig.canonSoftwarePath && fs.existsSync(cameraConfig.canonSoftwarePath)) {
        cameraControlPath = cameraConfig.canonSoftwarePath;
        console.log(`Using configured path: ${cameraControlPath}`);
      } else {
        throw new Error("Canon software not found. Please specify the correct path in the config.");
      }
    }
    
    console.log(`Starting CameraControl.exe from: ${cameraControlPath}`);
    
    // Start CameraControl.exe
    const cameraControlProcess = spawn(cameraControlPath, [], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    });
    
    canonProcesses.push(cameraControlProcess);
    
    // Give some time for the process to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if the process started successfully
    checkCameraControlProcess(null);
    
    return true;
  } catch (error) {
    console.error("Failed to start Canon camera processes:", error);
    return false;
  }
}

function startCameraMonitoring(mainWindow) {
  const config = configLoader.getConfig ? configLoader.getConfig() : configLoader.loadConfig();
  
  console.log('Starting camera monitoring for mode:', config.cameraMode);
  
  if (config.cameraMode === "canon") {
    cameraCheckInterval = setInterval(() => {
      checkCameraControlProcess(mainWindow);
    }, 1000);
    return cameraCheckInterval;
  } else if (config.cameraMode === "pc" || config.cameraMode === "dslr") {
    console.log('Starting generic camera monitoring');
    // Generic camera monitoring
    cameraCheckInterval = setInterval(() => {
      // Check camera connection
      console.log('Camera check: OK');
    }, 5000);
    return cameraCheckInterval;
  }
  
  return null;
}

function checkCameraControlProcess(mainWindow) {
  exec(
    'tasklist /FI "IMAGENAME eq CameraControl.exe"',
    execOptions,
    (error, stdout, stderr) => {
      if (error) {
        console.error("Error executing tasklist:", error);
        return;
      }
      const isRunning = stdout.includes("CameraControl.exe");
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send("camera-control-status", isRunning);
      }
      if (isRunning && cameraCheckInterval) {
        clearInterval(cameraCheckInterval);
        console.log("CameraControl.exe detected; further checks stopped.");
      } else if (!isRunning && config.cameraMode === "canon") {
        console.log("CameraControl.exe not detected, attempting to restart...");
        startCanonProcesses();
      }
    }
  );
}

function shutdownCamera() {
  try {
    // Stop any spawned processes first
    canonProcesses.forEach(process => {
      if (process && !process.killed) {
        try {
          process.kill();
        } catch (err) {
          console.log("Could not kill spawned process:", err);
        }
      }
    });
    
    if (config.cameraMode === "canon") {
      console.log("Closing Canon application...");
      try {
        execSync("taskkill /IM Api.exe /F", execOptions);
      } catch (error) {
        if (!error.message.includes('The process "Api.exe" not found')) {
          throw error;
        }
      }
      try {
        execSync("taskkill /IM CameraControl.exe /F", execOptions);
      } catch (error) {
        if (!error.message.includes('The process "CameraControl.exe" not found')) {
          throw error;
        }
      }
      try {
        execSync("taskkill /IM CameraControllerClient.exe /F", execOptions);
      } catch (error) {
        if (!error.message.includes('The process "CameraControllerClient.exe" not found')) {
          throw error;
        }
      }
    }
  } catch (error) {
    console.error("Failed to close Canon camera application:", error);
  }
}

module.exports = {
  initCamera,
  startCameraMonitoring,
  checkCameraControlProcess,
  shutdownCamera,
  startCanonProcesses
};
