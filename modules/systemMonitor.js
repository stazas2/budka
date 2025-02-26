const { exec } = require("child_process")
const si = require("systeminformation")

function startMonitoring(interval = 5000) {
  const monitorInterval = setInterval(async () => {
    try {
      const cpuLoad = await si.currentLoad()
      console.log(`Загрузка CPU: ${cpuLoad.currentLoad.toFixed(2)}%`)
    } catch (error) {
      console.error("Ошибка при получении загрузки CPU:", error)
    }
    
    exec(
      "nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits",
      (error, stdout, stderr) => {
        if (error) {
          console.error("Ошибка при получении загрузки GPU:", error)
          return
        }
        console.log(`Загрузка GPU: ${stdout.trim()}%`)
      }
    )
  }, interval)
  
  return monitorInterval
}

module.exports = {
  startMonitoring
}
