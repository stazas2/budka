const si = require('systeminformation');

class ProcessMonitor {
    constructor() {
        this.interval = null;
    }

    start(intervalMs = 10000) {
        if (this.interval) return;

        this.interval = setInterval(async () => {
            try {
                const cpu = await si.currentLoad();
                const mem = await si.mem();
                console.log(`[Monitor] CPU: ${cpu.currentLoad.toFixed(1)}% | RAM: ${(mem.active / 1024 / 1024).toFixed(1)} MB`);
            } catch (error) {
                console.error("[Monitor] Error fetching system info:", error);
            }
        }, intervalMs);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}

module.exports = new ProcessMonitor();