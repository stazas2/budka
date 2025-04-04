class TabSwitcher {
    constructor(container) {
        this.container = container;
        this.tabs = Array.from(container.querySelectorAll('.tab-button'));
        this.contents = Array.from(container.querySelectorAll('.tab-content'));

        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTo(tab.dataset.tab));
        });
    }

    switchTo(tabId) {
        this.tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });
        this.contents.forEach(content => {
            content.classList.toggle('active', content.id === tabId);
        });
    }
}

module.exports = TabSwitcher;