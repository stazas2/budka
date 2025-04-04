class NotificationManager {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        this.container = document.createElement('div');
        this.container.className = 'notification-container';
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerText = message;

        this.container.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, duration);
    }
}

module.exports = new NotificationManager();