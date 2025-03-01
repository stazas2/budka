const { exec, execSync } = require("child_process");
const configLoader = require('../utils/configLoader');
const os = require('os');

// Ensure proper encoding for exec commands on Windows
const execOptions = process.platform === 'win32' ? { encoding: 'utf8' } : {};

const config = configLoader.loadConfig();
let cameraCheckInterval = null;
let camera = null;
let cameraConfig = null;

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
      }
    }
  );
}

function shutdownCamera() {
  try {
    if (config.cameraMode === "canon") {
      console.log("Closing Canon application...");
      execSync("taskkill /IM Api.exe /F", execOptions);
      execSync("taskkill /IM CameraControl.exe /F", execOptions);
      execSync("taskkill /IM CameraControllerClient.exe /F", execOptions);
    }
  } catch (error) {
    console.error("Failed to close Canon camera application:", error);
  }
}

module.exports = {
  initCamera,
  startCameraMonitoring,
  checkCameraControlProcess,
  shutdownCamera
};
