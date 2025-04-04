class Countdown {
    constructor(container, duration = 5) {
        this.container = container;
        this.duration = duration;
        this.remaining = duration;
        this.interval = null;
    }

    start(callback) {
        this.remaining = this.duration;
        this.container.innerText = this.remaining;
        this.interval = setInterval(() => {
            this.remaining--;
            this.container.innerText = this.remaining;
            if (this.remaining <= 0) {
                clearInterval(this.interval);
                if (callback) callback();
            }
        }, 1000);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}

module.exports = Countdown;