const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec } = require("child_process")
const si = require("systeminformation")

let monitoringInterval = null;
let listeners = [];

/**
 * Get system information including CPU, memory and disk usage
 * @returns {Promise<Object>} System information
 */
async function getSystemInfo() {
  try {
    // Get CPU information
    const cpuInfo = {
      model: os.cpus()[0].model,
      cores: os.cpus().length,
      usage: getCpuUsage(),
      temperature: getCpuTemperature()
    };

    // Get memory information
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memInfo = {
      total: totalMem,
      free: freeMem,
      used: totalMem - freeMem,
      usedPercentage: ((totalMem - freeMem) / totalMem * 100).toFixed(2)
    };

    // Get disk information
    const diskInfo = await getDiskInfo();

    return {
      cpu: cpuInfo,
      memory: memInfo,
      disk: diskInfo
    };
  } catch (error) {
    console.error('Error getting system info:', error);
    return {
      cpu: { model: 'Unknown', cores: 0, usage: 0, temperature: 0 },
      memory: { total: 0, free: 0, used: 0, usedPercentage: 0 },
      disk: { total: 0, free: 0, used: 0, usedPercentage: 0 }
    };
  }
}

/**
 * Get CPU usage as percentage
 * @returns {number} CPU usage percentage
 */
function getCpuUsage() {
  // Simple placeholder implementation
  // For accurate CPU usage, you would need multiple samples over time
  return Math.floor(Math.random() * 100); // Mock implementation
}

/**
 * Get CPU temperature
 * @returns {number} CPU temperature
 */
function getCpuTemperature() {
  // This is a mock implementation
  // Real implementation would depend on the OS and available sensors
  return Math.floor(Math.random() * 30) + 30; // Return random temperature between 30-60°C
}

/**
 * Get disk information
 * @returns {Promise<Object>} Disk information
 */
async function getDiskInfo() {
  // Mock implementation
  const total = 1000000000000; // 1TB
  const free = total * (Math.random() * 0.5 + 0.2); // 20-70% free
  
  return {
    total,
    free,
    used: total - free,
    usedPercentage: ((total - free) / total * 100).toFixed(2)
  };
}

/**
 * Start monitoring system at specified interval
 * @param {number} interval - Monitoring interval in milliseconds
 * @param {function} callback - Callback function receiving system info
 */
function startMonitoring(interval = 5000, callback) {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }
  
  if (callback) {
    listeners.push(callback);
  }
  
  monitoringInterval = setInterval(async () => {
    const info = await getSystemInfo();
    listeners.forEach(listener => listener(info));
  }, interval);
  
  return true;
}

/**
 * Stop system monitoring
 */
function stopMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    return true;
  }
  return false;
}

module.exports = {
  getSystemInfo,
  startMonitoring,
  stopMonitoring
};
