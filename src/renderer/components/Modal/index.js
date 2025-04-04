class ModalManager {
    constructor() {
        this.modal = null;
        this.content = null;
        this.init();
    }

    init() {
        this.modal = document.createElement('div');
        this.modal.className = 'modal';
        this.modal.style.display = 'none';

        this.content = document.createElement('div');
        this.content.className = 'modal-content';

        this.modal.appendChild(this.content);
        document.body.appendChild(this.modal);

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
    }

    show(htmlContent) {
        this.content.innerHTML = htmlContent;
        this.modal.style.display = 'flex';
    }

    hide() {
        this.modal.style.display = 'none';
    }
}

module.exports = new ModalManager();